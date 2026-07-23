import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";
import ShareView from "./pages/ShareView";
import InviteAccept from "./pages/InviteAccept";

const TreeWorkspace = lazy(() => import("./pages/TreeWorkspace"));
const TreeMembers = lazy(() => import("./pages/TreeMembers"));
const TreePrint = lazy(() => import("./pages/TreePrint"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminAccounting = lazy(() => import("./pages/admin/AdminAccounting"));
const AdminPaymentGateways = lazy(() => import("./pages/admin/AdminPaymentGateways"));
const AdminGatewaySettings = lazy(() => import("./pages/admin/AdminGatewaySettings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminCompanySettings = lazy(() => import("./pages/admin/AdminCompanySettings"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
      جارٍ التحميل…
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account" element={<AccountSettings />} />
        <Route
          path="/checkout"
          element={
            <Suspense fallback={<PageLoader />}>
              <Checkout />
            </Suspense>
          }
        />
        <Route
          path="/checkout/success"
          element={
            <Suspense fallback={<PageLoader />}>
              <CheckoutSuccess />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminOverview />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminUsers />
              </Suspense>
            }
          />
          <Route
            path="invoices"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminInvoices />
              </Suspense>
            }
          />
          <Route
            path="plans"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminPlans />
              </Suspense>
            }
          />
          <Route
            path="accounting"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminAccounting />
              </Suspense>
            }
          />
          <Route
            path="gateways"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminPaymentGateways />
              </Suspense>
            }
          />
          <Route
            path="gateways/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminGatewaySettings />
              </Suspense>
            }
          />
          <Route
            path="coupons"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminCoupons />
              </Suspense>
            }
          />
          <Route
            path="company"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminCompanySettings />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="/trees/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <TreeWorkspace />
            </Suspense>
          }
        />
        <Route
          path="/trees/:id/members"
          element={
            <Suspense fallback={<PageLoader />}>
              <TreeMembers />
            </Suspense>
          }
        />
        <Route
          path="/trees/:id/print"
          element={
            <Suspense fallback={<PageLoader />}>
              <TreePrint />
            </Suspense>
          }
        />
        <Route path="/share/:token" element={<ShareView />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
