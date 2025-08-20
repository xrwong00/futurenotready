import { 
  fetchJobsForRecruiterAction, 
  fetchProfileAction,
  fetchJobApplicationsForRecruiter 
} from "@/actions";
import RecruiterDashboard from "@/components/recruiter-dashboard";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

async function RecruiterDashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }
  
  const profileInfo = await fetchProfileAction(user?.id);

  if (!profileInfo) {
    redirect("/onboard");
  }
  
  // Verify the user is a recruiter
  if (profileInfo.role !== "recruiter") {
    redirect("/");
  }
  
  const jobsList = await fetchJobsForRecruiterAction(user?.id);
  const jobApplications = await fetchJobApplicationsForRecruiter(user?.id);

  return <RecruiterDashboard jobsList={jobsList} jobApplications={jobApplications} />;
}

export default RecruiterDashboardPage;
