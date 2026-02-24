import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layout";
import { DashboardPage } from "./components/dashboard-page";
import { SettingsPage } from "./components/settings-page";
import { ProfilePage } from "./components/profile-page";
import { TransactionsPage } from "./components/transactions-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "settings", Component: SettingsPage },
      { path: "profile", Component: ProfilePage },
      { path: "transactions", Component: TransactionsPage },
    ],
  },
]);
