"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import UserInfo from "@/components/profile/UserInfo";
import RecentOrders from "@/components/profile/RecentOrders";
import AccountActions from "@/components/profile/AccountActions";

import "./profile.css";

export default function ProfilePage() {

  return (

    <main className="profile-container">

      <ProfileHeader />

      <UserInfo />

      <RecentOrders />

      <AccountActions />

    </main>

  );

}