import { z } from "zod";
import { and, eq, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { persons, relationships, treeBranches, personLinks, trees, type Person, type Relationship } from "@db/tables";
import { insertReturningId } from "./queries/insert-id";
import {
  applyPublicPrivacy,
  filterPersonsForMember,
  getViewableTreeByShareToken,
  logChange,
  requireTreeRole,
} from "./permissions";
import { assertCanAddPerson } from "./planLimits";
import { PERSON_PRIVACY, RELATIONSHIP_TYPES, UNNAMED_MOTHER_LABEL } from "@contracts/constants";
import {
  ensureBranchFromLineage,
  resolveFatherForMotherChild,
  searchSimilarPersons,
} from "./lineageHelpers";
import { assignTwinOf, clearTwinGroup } from "./twinLink";

const spouseDateFields = {
  marriageDay: z.number().int().min(1).max(31).nullish(),
  marriageMonth: z.number().int().min(1).max(12).nullish(),
  marriageYear: z.number().int().min(0).max(2100).nullish(),
  divorceDay: z.number().int().min(1).max(31).nullish(),
  divorceMonth: z.number().int().min(1).max(12).nullish(),
  divorceYear: z.number().int().min(0).max(2100).nullish(),
};

const personFields = {
  givenName: z.string().min(1, "الاسم مطلوب").max(255),
  fatherName: z.string().max(500).nullish(),
  kunya: z.string().max(255).nullish(),
  laqab: z.string().max(255).nullish(),
  clan: z.string().max(255).nullish(),
  gender: z.enum(["male", "female"]),
  birthDay: z.number().int().min(1).max(31).nullish(),
  birthMonth: z.number().int().min(1).max(12).nullish(),
  birthYear: z.number().int().min(0).max(2100).nullish(),
  birthPlace: z.string().max(255).nullish(),
  deathDay: z.number().int().min(1).max(31).nullish(),
  deathMonth: z.number().int().min(1).max(12).nullish(),
  deathYear: z.number().int().min(0).max(2100).nullish(),
  deathPlace: z.string().max(255).nullish(),
  isLiving: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .transform((v) => v === true || v === 1)
    .default(true),
  privacy: z.enum(PERSON_PRIVACY).default("family"),
  photoUrl: z.string().max(500_000).nullish(),
  notes: z.string().max(10000).nullish(),
};

type Db = ReturnType<typeof getDb>;

async function ensureSpouseLink(
  db: Db,
  treeId: number,
  aId: number,
  bId: number,
) {
  if (aId === bId) return;
  const spouseCheck = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.treeId, treeId),
        eq(relationships.type, "spouse"),
        or(
          and(
            eq(relationships.fromPersonId, aId),
            eq(relationships.toPersonId, bId),
          ),
          and(
            eq(relationships.fromPersonId, bId),
            eq(relationships.toPersonId, aId),
          ),
        ),
      ),
    );
  if (spouseCheck.length === 0) {
    await db.insert(relationships).values({
      treeId,
      fromPersonId: aId,
      toPersonId: bId,
      type: "spouse",
    });
  }
}

async function fetchOppositeSpouses(
  db: Db,
  treeId: number,
  personId: number,
  personGender: string,
) {
  const spouseRels = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.treeId, treeId),
        eq(relationships.type, "spouse"),
        or(
          eq(relationships.fromPersonId, personId),
          eq(relationships.toPersonId, personId),
        ),
      ),
    );
  const people = (await db
    .select()
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)))) as Person[];
  const byId = new Map(people.map((p) => [p.id, p]));
  const result: Person[] = [];
  for (const sr of spouseRels) {
    const sid =
      sr.fromPersonId === personId ? sr.toPersonId : sr.fromPersonId;
    const sp = byId.get(sid);
    if (sp && sp.gender !== personGender) result.push(sp);
  }
  return result;
}

async function ensureUnnamedMotherForFather(
  db: Db,
  treeId: number,
  userId: number,
  fatherId: number,
): Promise<number> {
  const wives = await fetchOppositeSpouses(db, treeId, fatherId, "male");
  for (const w of wives) {
    if (w.givenName === UNNAMED_MOTHER_LABEL || w.givenName === "أم") {
      return w.id;
    }
  }
  const motherId = await insertReturningId(persons, {
    treeId,
    givenName: UNNAMED_MOTHER_LABEL,
    gender: "female",
    isLiving: true,
    privacy: "family",
    createdById: userId,
  });
  await ensureSpouseLink(db, treeId, fatherId, motherId);
  return motherId;
}

async function removeParentsOfGender(
  db: Db,
  treeId: number,
  childId: number,
  gender: "male" | "female",
  keepParentId?: number,
) {
  const existing = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.treeId, treeId),
        eq(relationships.toPersonId, childId),
        eq(relationships.type, "parent"),
      ),
    );
  for (const rel of existing) {
    if (keepParentId && rel.fromPersonId === keepParentId) continue;
    const p = await db.query.persons.findFirst({
      where: eq(persons.id, rel.fromPersonId),
    });
    if (p?.gender === gender) {
      await db
        .delete(relationships)
        .where(eq(relationships.id, rel.id));
    }
  }
}

async function setParentLink(
  db: Db,
  treeId: number,
  parentId: number,
  childId: number,
) {
  const parent = await db.query.persons.findFirst({
    where: and(eq(persons.id, parentId), eq(persons.treeId, treeId)),
  });
  if (!parent) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "الأب/الأم غير موجود",
    });
  }
  const gender = parent.gender === "female" ? "female" : "male";
  await removeParentsOfGender(db, treeId, childId, gender, parentId);
  await insertParentIfMissing(db, treeId, parentId, childId);
}

async function insertParentIfMissing(
  db: Db,
  treeId: number,
  parentId: number,
  childId: number,
) {
  const exists = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.treeId, treeId),
        eq(relationships.fromPersonId, parentId),
        eq(relationships.toPersonId, childId),
        eq(relationships.type, "parent"),
      ),
    );
  if (exists.length === 0) {
    await db.insert(relationships).values({
      treeId,
      fromPersonId: parentId,
      toPersonId: childId,
      type: "parent",
    });
  }
}

/** ربط شخص (جديد أو موجود) بالمربوط به حسب صلة القرابة */
async function applyKinshipLink(
  db: Db,
  treeId: number,
  userId: number,
  childId: number,
  link: {
    personId: number;
    kinship: string;
    otherParentId?: number;
    createUnnamedMother?: boolean;
  },
  opts: {
    fatherName?: string | null;
    clan?: string | null;
    autoParentId?: number | null;
    createBranchFromLineage?: boolean;
  } = {},
) {
  const anchorId = link.personId;
  const kinship = link.kinship;
  const anchorPerson = await db.query.persons.findFirst({
    where: eq(persons.id, anchorId),
  });
  if (!anchorPerson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "الشخص المربوط غير موجود" });
  }

  if (kinship === "spouse") {
    const existingParent = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.type, "parent"),
          or(
            and(
              eq(relationships.fromPersonId, anchorId),
              eq(relationships.toPersonId, childId),
            ),
            and(
              eq(relationships.fromPersonId, childId),
              eq(relationships.toPersonId, anchorId),
            ),
          ),
        ),
      );
    if (existingParent.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "لا يمكن جعل شخص زوجاً لأحد أصوله أو أبنائه",
      });
    }
    await ensureSpouseLink(db, treeId, anchorId, childId);

    // ربط الزوجة/الزوج بسلسلة أبيه من «النسب المتسلسل» — فقط عند التفعيل الصريح،
    // ودون دمج تلقائي مع عائلات موجودة أو ربط إخوة بالاسم.
    let autoParentId = opts.autoParentId ?? null;
    if (
      opts.createBranchFromLineage &&
      opts.fatherName?.trim() &&
      !autoParentId
    ) {
      const branch = await ensureBranchFromLineage(
        db,
        treeId,
        userId,
        opts.fatherName.trim(),
        opts.clan,
        { reuseExisting: false },
      );
      autoParentId = branch.directFatherId;
      if (branch.branchId) {
        const spouse = await db.query.persons.findFirst({
          where: and(eq(persons.id, childId), eq(persons.treeId, treeId)),
        });
        if (spouse && !spouse.branchId) {
          await db
            .update(persons)
            .set({ branchId: branch.branchId })
            .where(eq(persons.id, childId));
        }
      }
    }
    if (autoParentId && autoParentId !== childId && autoParentId !== anchorId) {
      await setParentLink(db, treeId, autoParentId, childId);
    }
    return;
  }

  if (kinship === "son" || kinship === "daughter") {
    let resolvedOtherParentId = link.otherParentId;
    let autoParentId = opts.autoParentId ?? null;

    if (link.createUnnamedMother && anchorPerson.gender === "male") {
      resolvedOtherParentId = await ensureUnnamedMotherForFather(
        db,
        treeId,
        userId,
        anchorId,
      );
    }

    if (!resolvedOtherParentId && !link.createUnnamedMother) {
      const oppositeSpouses = await fetchOppositeSpouses(
        db,
        treeId,
        anchorId,
        anchorPerson.gender,
      );
      if (oppositeSpouses.length === 1) {
        resolvedOtherParentId = oppositeSpouses[0].id;
      } else if (oppositeSpouses.length > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            anchorPerson.gender === "male"
              ? "الأب لديه أكثر من زوجة — اختر الأم أو «أم غير مسجّلة»"
              : "الأم لديها أكثر من زوج — اختر الأب",
        });
      } else if (anchorPerson.gender === "male") {
        resolvedOtherParentId = await ensureUnnamedMotherForFather(
          db,
          treeId,
          userId,
          anchorId,
        );
      }
    }

    if (
      opts.createBranchFromLineage &&
      opts.fatherName?.trim() &&
      !autoParentId &&
      !resolvedOtherParentId
    ) {
      const branch = await ensureBranchFromLineage(
        db,
        treeId,
        userId,
        opts.fatherName.trim(),
        opts.clan,
        { reuseExisting: false },
      );
      autoParentId = branch.directFatherId;
    }

    if (
      anchorPerson.gender === "female" &&
      !resolvedOtherParentId &&
      opts.fatherName?.trim()
    ) {
      resolvedOtherParentId =
        (await resolveFatherForMotherChild(
          db,
          treeId,
          userId,
          anchorId,
          opts.fatherName.trim(),
          opts.clan,
          { createIfMissing: !!opts.createBranchFromLineage },
        )) ?? undefined;
    }

    if (
      !resolvedOtherParentId &&
      autoParentId &&
      autoParentId !== anchorId &&
      !(
        anchorPerson.gender === "male" &&
        (kinship === "son" || kinship === "daughter")
      )
    ) {
      resolvedOtherParentId = autoParentId;
    }

    await setParentLink(db, treeId, anchorId, childId);

    const anchorIsFather =
      anchorPerson.gender === "male" &&
      (kinship === "son" || kinship === "daughter");

    const otherParentIds = new Set<number>();
    if (
      resolvedOtherParentId &&
      resolvedOtherParentId !== anchorId &&
      resolvedOtherParentId !== childId
    ) {
      otherParentIds.add(resolvedOtherParentId);
    }
    // لا نضيف autoParent كأب ثانٍ إذا اختار المستخدم الأب/الأم الآخر يدوياً
    if (
      !resolvedOtherParentId &&
      autoParentId &&
      autoParentId !== anchorId &&
      autoParentId !== childId &&
      !anchorIsFather
    ) {
      otherParentIds.add(autoParentId);
    }

    for (const otherId of otherParentIds) {
      const otherPerson = await db.query.persons.findFirst({
        where: and(eq(persons.id, otherId), eq(persons.treeId, treeId)),
      });
      if (!otherPerson) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الأب/الأم الآخر غير موجود",
        });
      }
      if (otherPerson.gender === anchorPerson.gender) {
        continue;
      }
      await ensureSpouseLink(db, treeId, anchorId, otherId);
      await setParentLink(db, treeId, otherId, childId);
    }

    // لا نربط إخوة تلقائياً بالاسم — الربط اليدوي فقط
    return;
  }

  if (kinship === "father" || kinship === "mother") {
    // childId هنا هو الأب/الأم (other)، anchorId هو الابن
    await setParentLink(db, treeId, childId, anchorId);
    return;
  }

  if (kinship === "brother" || kinship === "sister") {
    const parentRels = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.toPersonId, anchorId),
          eq(relationships.type, "parent"),
        ),
      );
    if (parentRels.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "لا يمكن ربط أخ/أخت قبل إضافة أب أو أم للشخص المختار أولاً",
      });
    }
    for (const pr of parentRels) {
      await setParentLink(db, treeId, pr.fromPersonId, childId);
    }
  }
}

async function getTreeData(treeId: number) {
  const db = getDb();
  // لا نعدّل العلاقات عند القراءة — أي إصلاح يجب أن يكون صريحاً من المستخدم/أداة صيانة
  const people = (await db
    .select()
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)))) as Person[];
  const rels = (await db
    .select()
    .from(relationships)
    .where(eq(relationships.treeId, treeId))) as Relationship[];
  const branches = await db
    .select()
    .from(treeBranches)
    .where(eq(treeBranches.treeId, treeId));
  const links = await db
    .select()
    .from(personLinks)
    .where(eq(personLinks.treeId, treeId));

  const remotePeople: Array<Person & { linkId: number; forPersonId: number }> =
    [];
  for (const link of links) {
    const remote = await db.query.persons.findFirst({
      where: and(
        eq(persons.id, link.remotePersonId),
        eq(persons.treeId, link.remoteTreeId),
        isNull(persons.deletedAt),
      ),
    });
    if (remote) {
      remotePeople.push({
        ...(remote as Person),
        linkId: link.id,
        forPersonId: link.localPersonId,
      });
    }
  }

  return { people, rels, branches, personLinks: links, remotePeople };
}

export const personRouter = createRouter({
  /** قائمة الأشخاص والعلاقات — للأعضاء (يرون كل شيء) */
  list: authedQuery
    .input(z.object({ treeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const role = await requireTreeRole(ctx.user.id, input.treeId, "viewer");
      const data = await getTreeData(input.treeId);
      return {
        ...data,
        people: filterPersonsForMember(data.people, role, ctx.user.id),
      };
    }),

  /** عرض عام — يتطلب shareToken (لا يمكن تخمين الشجرة برقمها) */
  listPublic: publicQuery
    .input(z.object({ shareToken: z.string().min(16).max(64) }))
    .query(async ({ ctx, input }) => {
      const { tree, role } = await getViewableTreeByShareToken(
        input.shareToken,
        ctx.user?.id,
      );
      const data = await getTreeData(tree.id);
      if (role) {
        return {
          tree: { ...tree, myRole: role },
          ...data,
          people: filterPersonsForMember(data.people, role, ctx.user!.id),
        };
      }
      const visible = applyPublicPrivacy(data.people, tree);
      const visibleIds = new Set(visible.map((p) => p.id));
      const rels = data.rels.filter(
        (r) => visibleIds.has(r.fromPersonId) && visibleIds.has(r.toPersonId),
      );
      return {
        tree: {
          id: tree.id,
          name: tree.name,
          tribe: tree.tribe,
          region: tree.region,
          description: tree.description,
          myRole: null,
        },
        people: visible,
        rels,
      };
    }),

  create: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        ...personFields,
        // صلة القرابة بالشخص الموجود
        link: z
          .object({
            personId: z.number().int().positive(),
            /** الأب / الأم / أخ / أخت / زوج / ابن / بنت */
            kinship: z.enum([
              "father",
              "mother",
              "brother",
              "sister",
              "spouse",
              "son",
              "daughter",
            ]),
            /** الأب/الأم الآخر عند إضافة ابن/بنت (مثلاً الأم عند اختيار الأب) */
            otherParentId: z.number().int().positive().optional(),
            /** إنشاء أم placeholder بدون اسم (زوجة غير مسجّلة) */
            createUnnamedMother: z.boolean().optional(),
          })
          .nullish(),
        /** ربط شخص موجود بدل إنشاء جديد (مثلاً زوج/زوجة) */
        linkExistingId: z.number().int().positive().optional(),
        /** توأم لشخص موجود (إخوة من نفس الأب) */
        twinOfPersonId: z.number().int().positive().optional(),
        /** إنشاء فرع نسب تلقائياً من حقل النسب */
        createBranchFromLineage: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const treeRow = await db
        .select({ ownerId: trees.ownerId })
        .from(trees)
        .where(eq(trees.id, input.treeId))
        .then((r) => r[0]);
      if (!treeRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
      }
      await assertCanAddPerson(treeRow.ownerId, input.treeId, 1);

      const { treeId, link, linkExistingId, createBranchFromLineage, twinOfPersonId, ...fields } =
        input;

      // إن وُجدت شجرة فيها أشخاص، الربط إلزامي من الواجهة — نتحقق أيضاً هنا
      const existingCount = (
        await db
          .select({ id: persons.id })
          .from(persons)
          .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)))
      ).length;
      if (existingCount > 0 && !link) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب تحديد صلة القرابة بشخص موجود في الشجرة",
        });
      }

      if (linkExistingId && link) {
        const existing = await db.query.persons.findFirst({
          where: and(
            eq(persons.id, linkExistingId),
            eq(persons.treeId, treeId),
            isNull(persons.deletedAt),
          ),
        });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الشخص غير موجود" });
        }

        let autoParentId: number | null = null;
        if (createBranchFromLineage && fields.fatherName?.trim()) {
          const branch = await ensureBranchFromLineage(
            db,
            treeId,
            ctx.user.id,
            fields.fatherName.trim(),
            fields.clan,
            { reuseExisting: false },
          );
          autoParentId = branch.directFatherId;
        }

        await applyKinshipLink(db, treeId, ctx.user.id, linkExistingId, link, {
          fatherName: fields.fatherName,
          clan: fields.clan,
          autoParentId,
          createBranchFromLineage,
        });

        await logChange({
          treeId,
          userId: ctx.user.id,
          personId: linkExistingId,
          action:
            link.kinship === "spouse"
              ? "link_existing_spouse"
              : "link_existing_person",
          details: `ربط ${existing.givenName} (${link.kinship})`,
        });
        return { id: linkExistingId, linked: true };
      }

      let branchId: number | undefined;
      let autoParentId: number | null = null;
      if (createBranchFromLineage && fields.fatherName?.trim()) {
        const branch = await ensureBranchFromLineage(
          db,
          treeId,
          ctx.user.id,
          fields.fatherName.trim(),
          fields.clan,
          { reuseExisting: false },
        );
        if (branch.branchId) branchId = branch.branchId;
        autoParentId = branch.directFatherId;
      }

      // ورّث فرع النسب من الأب/الأم عند إضافة ابن/بنت/أخ/أخت
      if (
        !branchId &&
        link &&
        (link.kinship === "son" ||
          link.kinship === "daughter" ||
          link.kinship === "brother" ||
          link.kinship === "sister" ||
          link.kinship === "father" ||
          link.kinship === "mother")
      ) {
        const anchor = await db.query.persons.findFirst({
          where: and(
            eq(persons.id, link.personId),
            eq(persons.treeId, treeId),
            isNull(persons.deletedAt),
          ),
        });
        if (anchor?.branchId) branchId = anchor.branchId;
      }

      const id = await insertReturningId(persons, {
        ...fields,
        treeId,
        branchId,
        createdById: ctx.user.id,
      });

      try {
        if (autoParentId && autoParentId !== id) {
          const handledByKinshipLink =
            link &&
            (link.kinship === "son" ||
              link.kinship === "daughter" ||
              link.kinship === "brother" ||
              link.kinship === "sister" ||
              link.kinship === "spouse");
          if (!handledByKinshipLink) {
            await db.insert(relationships).values({
              treeId,
              fromPersonId: autoParentId,
              toPersonId: id,
              type: "parent",
            });
          }
        }

        if (link) {
          await applyKinshipLink(db, treeId, ctx.user.id, id, link, {
            fatherName: fields.fatherName,
            clan: fields.clan,
            autoParentId,
            createBranchFromLineage,
          });
        }

        if (twinOfPersonId) {
          const allPeople = await db
            .select()
            .from(persons)
            .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
          const allRels = await db
            .select()
            .from(relationships)
            .where(eq(relationships.treeId, treeId));
          await assignTwinOf(
            db,
            treeId,
            id,
            twinOfPersonId,
            allRels,
            allPeople,
          );
        }
      } catch (err) {
        await db
          .update(persons)
          .set({ deletedAt: new Date() })
          .where(and(eq(persons.id, id), eq(persons.treeId, treeId)));
        throw err;
      }

      await logChange({
        treeId,
        userId: ctx.user.id,
        personId: id,
        action: "create_person",
        details: link
          ? `أضاف "${input.givenName}" (${link.kinship})`
          : `أضاف "${input.givenName}"`,
      });
      return { id };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        treeId: z.number().int().positive(),
        ...personFields,
        /** تحديث الأم/الأب (اختياري) */
        motherId: z.number().int().positive().nullable().optional(),
        fatherId: z.number().int().positive().nullable().optional(),
        /** ربط/فك توأم — null يزيل من المجموعة */
        twinOfPersonId: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const { id, treeId, motherId, fatherId, twinOfPersonId, ...fields } = input;

      const existing = await db.query.persons.findFirst({
        where: and(eq(persons.id, id), eq(persons.treeId, treeId)),
      });
      if (!existing || existing.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشخص غير موجود" });
      }

      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) clean[k] = v;
      }
      await db
        .update(persons)
        .set(clean)
        .where(and(eq(persons.id, id), eq(persons.treeId, treeId)));

      const personRow = await db.query.persons.findFirst({
        where: and(eq(persons.id, id), eq(persons.treeId, treeId)),
      });
      if (!personRow) throw new TRPCError({ code: "NOT_FOUND" });

      const syncParent = async (
        role: "male" | "female",
        newParentId: number | null | undefined,
      ) => {
        if (newParentId === undefined) return;
        const existing = await db
          .select()
          .from(relationships)
          .where(
            and(
              eq(relationships.treeId, treeId),
              eq(relationships.toPersonId, id),
              eq(relationships.type, "parent"),
            ),
          );
        const byId = new Map<number, { gender: string }>();
        for (const r of existing) {
          const p = await db.query.persons.findFirst({
            where: eq(persons.id, r.fromPersonId),
          });
          if (p) byId.set(r.fromPersonId, p);
        }
        for (const r of existing) {
          const p = byId.get(r.fromPersonId);
          if (p?.gender === role) {
            await db.delete(relationships).where(eq(relationships.id, r.id));
          }
        }
        if (newParentId && newParentId !== id) {
          const parent = await db.query.persons.findFirst({
            where: and(eq(persons.id, newParentId), eq(persons.treeId, treeId)),
          });
          if (!parent) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "الأب/الأم غير موجود" });
          }
          if (parent.gender !== role) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: role === "female" ? "يجب اختيار أنثى كأم" : "يجب اختيار ذكر كأب",
            });
          }
          const spouseConflict = await db
            .select()
            .from(relationships)
            .where(
              and(
                eq(relationships.treeId, treeId),
                eq(relationships.type, "spouse"),
                or(
                  and(
                    eq(relationships.fromPersonId, newParentId),
                    eq(relationships.toPersonId, id),
                  ),
                  and(
                    eq(relationships.fromPersonId, id),
                    eq(relationships.toPersonId, newParentId),
                  ),
                ),
              ),
            );
          if (spouseConflict.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "لا يمكن جعل الزوج/الزوجة أباً أو أماً",
            });
          }
          await db.insert(relationships).values({
            treeId,
            fromPersonId: newParentId,
            toPersonId: id,
            type: "parent",
          });
        }
      };

      await syncParent("female", motherId);
      await syncParent("male", fatherId);

      if (twinOfPersonId !== undefined) {
        if (twinOfPersonId === null) {
          await clearTwinGroup(db, treeId, id);
        } else {
          const allPeople = await db
            .select()
            .from(persons)
            .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
          const allRels = await db
            .select()
            .from(relationships)
            .where(eq(relationships.treeId, treeId));
          await assignTwinOf(
            db,
            treeId,
            id,
            twinOfPersonId,
            allRels,
            allPeople,
          );
        }
      }

      await logChange({
        treeId,
        userId: ctx.user.id,
        personId: id,
        action: "update_person",
        details: `عدّل "${input.givenName}"`,
      });
      return { ok: true };
    }),

  /** ربط شخصين موجودين كتوأم */
  linkTwin: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        personId: z.number().int().positive(),
        twinOfPersonId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const allPeople = await db
        .select()
        .from(persons)
        .where(
          and(eq(persons.treeId, input.treeId), isNull(persons.deletedAt)),
        );
      const allRels = await db
        .select()
        .from(relationships)
        .where(eq(relationships.treeId, input.treeId));
      await assignTwinOf(
        db,
        input.treeId,
        input.personId,
        input.twinOfPersonId,
        allRels,
        allPeople,
      );
      const person = allPeople.find((p) => p.id === input.personId);
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        personId: input.personId,
        action: "link_twin",
        details: `ربط توأم: ${person?.givenName ?? input.personId}`,
      });
      return { ok: true };
    }),

  /** فك توأم عن شخص */
  unlinkTwin: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        personId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      await clearTwinGroup(db, input.treeId, input.personId);
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        personId: input.personId,
        action: "unlink_twin",
        details: "فك توأم",
      });
      return { ok: true };
    }),

  restore: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        treeId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "admin");
      const person = await db.query.persons.findFirst({
        where: and(eq(persons.id, input.id), eq(persons.treeId, input.treeId)),
      });
      if (!person || !person.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد شخص محذوف" });
      }
      await db.update(persons).set({ deletedAt: null }).where(eq(persons.id, input.id));
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        personId: input.id,
        action: "restore_person",
        details: `استُرجع "${person.givenName}"`,
      });
      return { ok: true };
    }),

  /** حذف ناعم + إزالة العلاقات */
  remove: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        treeId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const person = await db.query.persons.findFirst({
        where: and(eq(persons.id, input.id), eq(persons.treeId, input.treeId)),
      });
      if (!person) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(persons)
        .set({ deletedAt: new Date() })
        .where(eq(persons.id, input.id));
      await db
        .delete(relationships)
        .where(
          and(
            eq(relationships.treeId, input.treeId),
            or(
              eq(relationships.fromPersonId, input.id),
              eq(relationships.toPersonId, input.id),
            ),
          ),
        );
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        personId: input.id,
        action: "delete_person",
        details: `حذف "${person.givenName}" (قابل للاسترجاع)`,
      });
      return { ok: true };
    }),

  addRelationship: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        fromPersonId: z.number().int().positive(),
        toPersonId: z.number().int().positive(),
        type: z.enum(RELATIONSHIP_TYPES),
        ...spouseDateFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const {
        treeId,
        fromPersonId,
        toPersonId,
        type,
        marriageDay,
        marriageMonth,
        marriageYear,
        divorceDay,
        divorceMonth,
        divorceYear,
      } = input;
      if (fromPersonId === toPersonId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن ربط الشخص بنفسه",
        });
      }

      if (input.type === "spouse") {
        const asParent = await db
          .select()
          .from(relationships)
          .where(
            and(
              eq(relationships.treeId, input.treeId),
              eq(relationships.type, "parent"),
              or(
                and(
                  eq(relationships.fromPersonId, input.fromPersonId),
                  eq(relationships.toPersonId, input.toPersonId),
                ),
                and(
                  eq(relationships.fromPersonId, input.toPersonId),
                  eq(relationships.toPersonId, input.fromPersonId),
                ),
              ),
            ),
          );
        if (asParent.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن ربط شخص بزوج/زوجة إذا كان أحد أصوله أو أبنائه",
          });
        }
      }

      if (input.type === "parent") {
        const asSpouse = await db
          .select()
          .from(relationships)
          .where(
            and(
              eq(relationships.treeId, input.treeId),
              eq(relationships.type, "spouse"),
              or(
                and(
                  eq(relationships.fromPersonId, input.fromPersonId),
                  eq(relationships.toPersonId, input.toPersonId),
                ),
                and(
                  eq(relationships.fromPersonId, input.toPersonId),
                  eq(relationships.toPersonId, input.fromPersonId),
                ),
              ),
            ),
          );
        if (asSpouse.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن ربط أب/أم بابنه/ابنته إذا كانا زوجين",
          });
        }
      }

      await db.insert(relationships).values({
        treeId,
        fromPersonId,
        toPersonId,
        type,
        marriageDay: type === "spouse" ? (marriageDay ?? null) : null,
        marriageMonth: type === "spouse" ? (marriageMonth ?? null) : null,
        marriageYear: type === "spouse" ? (marriageYear ?? null) : null,
        divorceDay: type === "spouse" ? (divorceDay ?? null) : null,
        divorceMonth: type === "spouse" ? (divorceMonth ?? null) : null,
        divorceYear: type === "spouse" ? (divorceYear ?? null) : null,
      });
      await logChange({
        treeId,
        userId: ctx.user.id,
        action: "add_relationship",
        details: `ربط ${type === "parent" ? "أب/أم ← ابن" : "زواج"} #${fromPersonId} ↔ #${toPersonId}`,
      });
      return { ok: true };
    }),

  /** ربط شخصين موجودين — ابن/بنت/أب/أم/أخ/أخت/زوج */
  linkExistingKinship: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        anchorId: z.number().int().positive(),
        otherId: z.number().int().positive(),
        kinship: z.enum([
          "son",
          "daughter",
          "father",
          "mother",
          "brother",
          "sister",
          "spouse",
        ]),
        otherParentId: z.number().int().positive().optional(),
        createUnnamedMother: z.boolean().optional(),
        ...spouseDateFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const { treeId, anchorId, otherId, kinship, otherParentId, createUnnamedMother } =
        input;

      if (anchorId === otherId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن ربط الشخص بنفسه",
        });
      }

      const anchor = await db.query.persons.findFirst({
        where: and(
          eq(persons.id, anchorId),
          eq(persons.treeId, treeId),
          isNull(persons.deletedAt),
        ),
      });
      const other = await db.query.persons.findFirst({
        where: and(
          eq(persons.id, otherId),
          eq(persons.treeId, treeId),
          isNull(persons.deletedAt),
        ),
      });
      if (!anchor || !other) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشخص غير موجود" });
      }

      if (kinship === "father" && other.gender === "female") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الشخص المختار أنثى — اختر «أم» بدلاً من «أب»",
        });
      }
      if (kinship === "mother" && other.gender === "male") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الشخص المختار ذكر — اختر «أب» بدلاً من «أم»",
        });
      }

      const linkOpts = {
        fatherName: other.fatherName ?? anchor.fatherName,
        clan: other.clan ?? anchor.clan,
      };
      const kinshipLink = {
        personId: anchorId,
        kinship,
        otherParentId,
        createUnnamedMother,
      };

      if (kinship === "spouse") {
        await applyKinshipLink(
          db,
          treeId,
          ctx.user.id,
          otherId,
          { personId: anchorId, kinship: "spouse" },
          linkOpts,
        );
        const spouseRels = await db
          .select()
          .from(relationships)
          .where(
            and(
              eq(relationships.treeId, treeId),
              eq(relationships.type, "spouse"),
              or(
                and(
                  eq(relationships.fromPersonId, anchorId),
                  eq(relationships.toPersonId, otherId),
                ),
                and(
                  eq(relationships.fromPersonId, otherId),
                  eq(relationships.toPersonId, anchorId),
                ),
              ),
            ),
          );
        const rel = spouseRels[0];
        if (rel) {
          await db
            .update(relationships)
            .set({
              marriageDay: input.marriageDay ?? null,
              marriageMonth: input.marriageMonth ?? null,
              marriageYear: input.marriageYear ?? null,
              divorceDay: input.divorceDay ?? null,
              divorceMonth: input.divorceMonth ?? null,
              divorceYear: input.divorceYear ?? null,
            })
            .where(eq(relationships.id, rel.id));
        }
      } else if (kinship === "father" || kinship === "mother") {
        await applyKinshipLink(
          db,
          treeId,
          ctx.user.id,
          otherId,
          kinshipLink,
          linkOpts,
        );
      } else {
        await applyKinshipLink(
          db,
          treeId,
          ctx.user.id,
          otherId,
          kinshipLink,
          linkOpts,
        );
      }

      // مزامنة اسم الأب في السجل ليظهر النسب في القائمة والمخطط
      if (
        (kinship === "son" || kinship === "daughter") &&
        anchor.gender === "male" &&
        !other.fatherName?.trim()
      ) {
        await db
          .update(persons)
          .set({ fatherName: anchor.givenName })
          .where(eq(persons.id, otherId));
      }
      if (kinship === "father" && !anchor.fatherName?.trim()) {
        await db
          .update(persons)
          .set({ fatherName: other.givenName })
          .where(eq(persons.id, anchorId));
      }
      if (
        (kinship === "brother" || kinship === "sister") &&
        anchor.fatherName?.trim() &&
        !other.fatherName?.trim()
      ) {
        await db
          .update(persons)
          .set({ fatherName: anchor.fatherName })
          .where(eq(persons.id, otherId));
      }

      await logChange({
        treeId,
        userId: ctx.user.id,
        personId: anchorId,
        action: "link_existing_person",
        details: `ربط ${other.givenName} كـ ${kinship} لـ ${anchor.givenName}`,
      });
      return { ok: true };
    }),

  updateSpouseDates: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        relationshipId: z.number().int().positive(),
        ...spouseDateFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const { treeId, relationshipId, ...dates } = input;
      const rel = await db.query.relationships.findFirst({
        where: and(
          eq(relationships.id, relationshipId),
          eq(relationships.treeId, treeId),
          eq(relationships.type, "spouse"),
        ),
      });
      if (!rel) throw new TRPCError({ code: "NOT_FOUND" });

      const clean: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(dates)) {
        if (v !== undefined) clean[k] = v ?? null;
      }
      await db
        .update(relationships)
        .set(clean)
        .where(eq(relationships.id, relationshipId));
      return { ok: true };
    }),

  removeRelationship: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        treeId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      await db
        .delete(relationships)
        .where(
          and(
            eq(relationships.id, input.id),
            eq(relationships.treeId, input.treeId),
          ),
        );
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "remove_relationship",
        details: `أزال علاقة #${input.id}`,
      });
      return { ok: true };
    }),

  /**
   * استيراد جماعي من Excel/CSV:
   * ينشئ الأشخاص ثم يربطهم بآبائهم بالاسم (داخل الاستيراد أو الموجود مسبقاً)
   */
  bulkImport: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        rows: z
          .array(
            z.object({
              givenName: z.string().min(1).max(255),
              fatherName: z.string().max(500).nullish(),
              gender: z.enum(["male", "female"]).default("male"),
              birthYear: z.number().int().min(0).max(2100).nullish(),
              deathYear: z.number().int().min(0).max(2100).nullish(),
              kunya: z.string().max(255).nullish(),
              laqab: z.string().max(255).nullish(),
              clan: z.string().max(255).nullish(),
              notes: z.string().max(10000).nullish(),
            }),
          )
          .min(1)
          .max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const treeRow = await db
        .select({ ownerId: trees.ownerId })
        .from(trees)
        .where(eq(trees.id, input.treeId))
        .then((r) => r[0]);
      if (!treeRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
      }

      // خريطة الأسماء الموجودة مسبقاً في الشجرة
      const existing = await db
        .select()
        .from(persons)
        .where(
          and(eq(persons.treeId, input.treeId), isNull(persons.deletedAt)),
        );
      const idByName = new Map<string, number>();
      for (const p of existing) {
        if (!idByName.has(p.givenName)) idByName.set(p.givenName, p.id);
      }

      const newCount = input.rows.filter((r) => !idByName.has(r.givenName)).length;
      if (newCount > 0) {
        await assertCanAddPerson(treeRow.ownerId, input.treeId, newCount);
      }

      // إنشاء الأشخاص بالترتيب (الآباء عادة قبل الأبناء في الملف)
      let created = 0;
      const pendingLinks: Array<{ childId: number; fatherName: string }> = [];
      for (const row of input.rows) {
        const id = await insertReturningId(persons, {
            treeId: input.treeId,
            givenName: row.givenName,
            fatherName: row.fatherName ?? null,
            gender: row.gender,
            birthYear: row.birthYear ?? null,
            deathYear: row.deathYear ?? null,
            isLiving: !row.deathYear,
            kunya: row.kunya ?? null,
            laqab: row.laqab ?? null,
            clan: row.clan ?? null,
            notes: row.notes ?? null,
            createdById: ctx.user.id,
          });
        created++;
        if (!idByName.has(row.givenName)) idByName.set(row.givenName, id);
        if (row.fatherName) {
          // اسم الأب قد يكون متسلسلاً "محمد بن أحمد" — نأخذ الجزء الأول
          const firstName = row.fatherName.split(" ")[0]?.trim();
          if (firstName) pendingLinks.push({ childId: id, fatherName: firstName });
        }
      }

      // ربط الآباء بالاسم
      let linked = 0;
      for (const link of pendingLinks) {
        const fatherId = idByName.get(link.fatherName);
        if (fatherId && fatherId !== link.childId) {
          await db.insert(relationships).values({
            treeId: input.treeId,
            fromPersonId: fatherId,
            toPersonId: link.childId,
            type: "parent",
          });
          linked++;
        }
      }

      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "bulk_import",
        details: `استورد ${created} شخصاً وربط ${linked} علاقة`,
      });
      return { created, linked };
    }),

  /**
   * استيراد GEDCOM: أفراد + روابط أب/زوج عبر مفاتيح مؤقتة من الملف.
   */
  importGedcom: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        people: z
          .array(
            z.object({
              key: z.string().min(1).max(64),
              givenName: z.string().min(1).max(255),
              fatherName: z.string().max(500).nullish(),
              gender: z.enum(["male", "female"]),
              birthYear: z.number().int().min(0).max(2100).nullish(),
              birthMonth: z.number().int().min(1).max(12).nullish(),
              birthDay: z.number().int().min(1).max(31).nullish(),
              birthPlace: z.string().max(255).nullish(),
              deathYear: z.number().int().min(0).max(2100).nullish(),
              deathMonth: z.number().int().min(1).max(12).nullish(),
              deathDay: z.number().int().min(1).max(31).nullish(),
              deathPlace: z.string().max(255).nullish(),
              isLiving: z.boolean().default(true),
              kunya: z.string().max(255).nullish(),
              notes: z.string().max(10000).nullish(),
            }),
          )
          .min(1)
          .max(2000),
        links: z
          .array(
            z.object({
              type: z.enum(["parent", "spouse"]),
              fromKey: z.string().min(1).max(64),
              toKey: z.string().min(1).max(64),
            }),
          )
          .max(5000)
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const treeRow = await db
        .select({ ownerId: trees.ownerId })
        .from(trees)
        .where(eq(trees.id, input.treeId))
        .then((r) => r[0]);
      if (!treeRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
      }

      await assertCanAddPerson(treeRow.ownerId, input.treeId, input.people.length);

      const idByKey = new Map<string, number>();
      let created = 0;
      for (const row of input.people) {
        const id = await insertReturningId(persons, {
          treeId: input.treeId,
          givenName: row.givenName,
          fatherName: row.fatherName ?? null,
          gender: row.gender,
          birthYear: row.birthYear ?? null,
          birthMonth: row.birthMonth ?? null,
          birthDay: row.birthDay ?? null,
          birthPlace: row.birthPlace ?? null,
          deathYear: row.deathYear ?? null,
          deathMonth: row.deathMonth ?? null,
          deathDay: row.deathDay ?? null,
          deathPlace: row.deathPlace ?? null,
          isLiving: row.isLiving && !row.deathYear,
          kunya: row.kunya ?? null,
          notes: row.notes ?? null,
          createdById: ctx.user.id,
        });
        idByKey.set(row.key, id);
        created++;
      }

      let linked = 0;
      const seen = new Set<string>();
      for (const link of input.links) {
        const fromId = idByKey.get(link.fromKey);
        const toId = idByKey.get(link.toKey);
        if (!fromId || !toId || fromId === toId) continue;
        const dedupe =
          link.type === "spouse"
            ? `s:${[fromId, toId].sort((a, b) => a - b).join("-")}`
            : `p:${fromId}-${toId}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        await db.insert(relationships).values({
          treeId: input.treeId,
          fromPersonId: fromId,
          toPersonId: toId,
          type: link.type,
        });
        linked++;
      }

      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "import_gedcom",
        details: `استورد GEDCOM: ${created} شخصاً و${linked} رابطاً`,
      });
      return { created, linked };
    }),

  /** بحث عن أشخاص مشابهين بالاسم والنسب */
  searchLineage: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        givenName: z.string().min(1),
        fatherName: z.string().optional(),
        excludeId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireTreeRole(ctx.user.id, input.treeId, "viewer");
      const db = getDb();
      return searchSimilarPersons(
        db,
        input.treeId,
        input.givenName,
        input.fatherName,
        input.excludeId,
      );
    }),

  /** لا ينشئ روابط تلقائياً — الربط يتم يدوياً عند الإضافة/التعديل فقط */
  ensurePersonLineage: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        personId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      const db = getDb();
      const person = await db.query.persons.findFirst({
        where: and(
          eq(persons.id, input.personId),
          eq(persons.treeId, input.treeId),
          isNull(persons.deletedAt),
        ),
      });
      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشخص غير موجود" });
      }
      return {
        ok: true as const,
        linked: false,
        reason: "manual_only" as const,
      };
    }),

  /** إظهار/إخفاء فرع نسب */
  toggleBranch: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        branchId: z.number().int().positive(),
        isHidden: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      await db
        .update(treeBranches)
        .set({ isHidden: input.isHidden })
        .where(
          and(
            eq(treeBranches.id, input.branchId),
            eq(treeBranches.treeId, input.treeId),
          ),
        );
      return { ok: true };
    }),

  /** ربط زوج/زوجة من شجرة أخرى */
  linkExternalSpouse: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        localPersonId: z.number().int().positive(),
        remoteTreeId: z.number().int().positive(),
        remotePersonId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "editor");
      await requireTreeRole(ctx.user.id, input.remoteTreeId, "viewer");

      const local = await db.query.persons.findFirst({
        where: and(
          eq(persons.id, input.localPersonId),
          eq(persons.treeId, input.treeId),
        ),
      });
      const remote = await db.query.persons.findFirst({
        where: and(
          eq(persons.id, input.remotePersonId),
          eq(persons.treeId, input.remoteTreeId),
        ),
      });
      if (!local || !remote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشخص غير موجود" });
      }

      await db.insert(personLinks).values({
        treeId: input.treeId,
        localPersonId: input.localPersonId,
        remoteTreeId: input.remoteTreeId,
        remotePersonId: input.remotePersonId,
        linkType: "spouse",
      });

      await db.insert(personLinks).values({
        treeId: input.remoteTreeId,
        localPersonId: input.remotePersonId,
        remoteTreeId: input.treeId,
        remotePersonId: input.localPersonId,
        linkType: "spouse",
      });

      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        personId: input.localPersonId,
        action: "link_external_spouse",
        details: `ربط ${local.givenName} ↔ ${remote.givenName} (شجرة ${input.remoteTreeId})`,
      });
      return { ok: true };
    }),
});
