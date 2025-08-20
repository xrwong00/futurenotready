"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import CommonForm from "../common-form";
import {
  candidateOnboardFormControls,
  initialCandidateFormData,
  initialRecruiterFormData,
  recruiterOnboardFormControls,
} from "@/utils";
import { useUser } from "@clerk/nextjs";
import { createProfileAction } from "@/actions";

function OnBoard() {
  const [currentTab, setCurrentTab] = useState("candidate");
  const [recruiterFormData, setRecruiterFormData] = useState(
    initialRecruiterFormData
  );
  const [candidateFormData, setCandidateFormData] = useState(
    initialCandidateFormData
  );
  const [file, setFile] = useState(null);

  const currentAuthUser = useUser();
  const { user } = currentAuthUser;

  function handleFileChange(event) {
    event.preventDefault();
    const picked = event.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    // Immediately reflect chosen filename in UI
    setCandidateFormData((prev) => ({
      ...prev,
      resumeOriginalName: picked.name,
    }));
  }

  async function handleUploadPdfToSupabase() {
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("userId", user?.id || "anonymous");

      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Upload failed:", json?.error || res.statusText);
        return;
      }
      setCandidateFormData((prev) => ({
        ...prev,
        resume: json.publicUrl || json.path || prev.resume,
      }));
    } catch (err) {
      console.error("Error uploading resume:", err);
    }
  }

  console.log("Current form data:", candidateFormData);
  console.log("Form valid:", handleCandidateFormValid());

  useEffect(() => {
    if (file) handleUploadPdfToSupabase();
  }, [file]);

  function handleTabChange(value) {
    setCurrentTab(value);
  }

  function handleRecuiterFormValid() {
    return (
      recruiterFormData &&
      recruiterFormData.name.trim() !== "" &&
      recruiterFormData.companyName.trim() !== "" &&
      recruiterFormData.companyRole.trim() !== ""
    );
  }

  function handleCandidateFormValid() {
    // Required fields that must be filled
    const requiredFields = ["name", "email", "phoneNumber"];
    
    // Check if all required fields are filled and resume is uploaded
    return requiredFields.every(
      (key) => candidateFormData[key] && candidateFormData[key].trim() !== ""
    ) && candidateFormData.resume; // Resume is also required
  }

  async function createProfile() {
    try {
      console.log("Creating profile...");
      const data =
        currentTab === "candidate"
          ? {
              candidateInfo: candidateFormData,
              role: "candidate",
              isPremiumUser: false,
              userId: user?.id,
              email: user?.primaryEmailAddress?.emailAddress,
            }
          : {
              recruiterInfo: recruiterFormData,
              role: "recruiter",
              isPremiumUser: false,
              userId: user?.id,
              email: user?.primaryEmailAddress?.emailAddress,
            };

      console.log("Profile data:", data);
      await createProfileAction(data, "/");
      console.log("Profile created successfully!");
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  }

  console.log(candidateFormData);

  return (
    <div className="bg-white">
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="w-full">
          <div className="flex items-baseline justify-between border-b pb-6 pt-24">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Welcome to onboarding
            </h1>
            <TabsList>
              <TabsTrigger value="candidate">Candidate</TabsTrigger>
              <TabsTrigger value="recruiter">Recruiter</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="candidate">
          <CommonForm
            action={createProfile}
            formData={candidateFormData}
            setFormData={setCandidateFormData}
            formControls={candidateOnboardFormControls}
            buttonText={"Onboard as candidate"}
            handleFileChange={handleFileChange}
            isBtnDisabled={!handleCandidateFormValid()}
          />
        </TabsContent>
        <TabsContent value="recruiter">
          <CommonForm
            formControls={recruiterOnboardFormControls}
            buttonText={"Onboard as recruiter"}
            formData={recruiterFormData}
            setFormData={setRecruiterFormData}
            isBtnDisabled={!handleRecuiterFormValid()}
            action={createProfile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OnBoard;
