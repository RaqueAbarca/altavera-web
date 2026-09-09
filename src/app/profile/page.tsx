import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";

import "./profile.css";

export default function ProfilePage() {
  return (
    <main className="profile-container">
      <ProfileHeader />
      <ProfileTabs />
    </main>
  );
}
