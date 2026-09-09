"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Package, Settings, UserRound } from "lucide-react";
import UserInfo from "@/components/profile/UserInfo";
import AddressCard from "@/components/profile/AddressCard";
import FavoritesCard from "@/components/profile/FavoritesCard";
import RecentOrders from "@/components/profile/RecentOrders";
import AccountActions from "@/components/profile/AccountActions";

type ProfileTabId = "info" | "direcciones" | "favoritos" | "pedidos" | "cuenta";

const PROFILE_TABS = [
  { id: "info", label: "Información", icon: UserRound },
  { id: "direcciones", label: "Direcciones", icon: MapPin },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "pedidos", label: "Pedidos", icon: Package },
  { id: "cuenta", label: "Cuenta", icon: Settings },
] satisfies Array<{
  id: ProfileTabId;
  label: string;
  icon: typeof UserRound;
}>;

function isProfileTabId(value: string): value is ProfileTabId {
  return PROFILE_TABS.some((tab) => tab.id === value);
}

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("info");

  useEffect(() => {
    function syncTabWithHash() {
      const hash = window.location.hash.replace("#", "");
      if (isProfileTabId(hash)) setActiveTab(hash);
    }

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);
    window.addEventListener("popstate", syncTabWithHash);

    return () => {
      window.removeEventListener("hashchange", syncTabWithHash);
      window.removeEventListener("popstate", syncTabWithHash);
    };
  }, []);

  function selectTab(tabId: ProfileTabId) {
    setActiveTab(tabId);

    const url = new URL(window.location.href);
    url.hash = tabId === "info" ? "" : tabId;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % PROFILE_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PROFILE_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = PROFILE_TABS[nextIndex];
    selectTab(nextTab.id);
    requestAnimationFrame(() => {
      document.getElementById(`profile-tab-${nextTab.id}`)?.focus();
    });
  }

  return (
    <>
      <nav className="profile-tabs" aria-label="Secciones de mi perfil">
        <div className="profile-tabs__list" role="tablist">
          {PROFILE_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`profile-tab-${tab.id}`}
                type="button"
                role="tab"
                className={`profile-tab${selected ? " profile-tab--active" : ""}`}
                aria-selected={selected}
                aria-controls={`profile-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        id="profile-panel-info"
        className="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-info"
        hidden={activeTab !== "info"}
      >
        <UserInfo />
      </div>

      <div
        id="profile-panel-direcciones"
        className="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-direcciones"
        hidden={activeTab !== "direcciones"}
      >
        <AddressCard />
      </div>

      <div
        id="profile-panel-favoritos"
        className="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-favoritos"
        hidden={activeTab !== "favoritos"}
      >
        <FavoritesCard />
      </div>

      <div
        id="profile-panel-pedidos"
        className="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-pedidos"
        hidden={activeTab !== "pedidos"}
      >
        <RecentOrders />
      </div>

      <div
        id="profile-panel-cuenta"
        className="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-cuenta"
        hidden={activeTab !== "cuenta"}
      >
        <AccountActions />
      </div>
    </>
  );
}
