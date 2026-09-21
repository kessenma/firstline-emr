// apps/web/components/telegram-patient/container/intake-form/view-model/api/patient-api.ts
import type { PartialPatientFormData } from "../../types/patient";

// Function to fetch patient data
export async function fetchPatientData(token: string): Promise<any> {
  console.log("=== FETCH PATIENT DATA DEBUG ===");
  console.log("Fetching patient data with token:", token);
  console.log("Token length:", token.length);
  console.log("API URL:", `/api/telegram-intake-form/${token}`);

  try {
    const response = await fetch(`/api/telegram-intake-form/${token}`);
    console.log("API response status:", response.status);
    console.log("API response ok:", response.ok);
    console.log(
      "API response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response text:", errorText);

      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error("Failed to parse error response as JSON:", parseError);
        errorData = { message: errorText || "Failed to fetch patient data" };
      }

      console.error("API error data:", errorData);
      throw new Error(errorData.message || "Failed to fetch patient data");
    }

    const responseData = await response.json();
    console.log("API response data:", responseData);
    console.log("Patient ID from API:", responseData?.patient?.id);
    console.log(
      "Patient _id from API (should be undefined):",
      responseData?.patient?._id,
    );
    console.log("=== END FETCH DEBUG ===");
    return responseData;
  } catch (error) {
    console.error("=== FETCH ERROR ===");
    console.error("Fetch error:", error);
    console.error("Error type:", typeof error);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("=== END FETCH ERROR ===");
    throw error;
  }
}

// Function to create or update patient
export async function createOrUpdatePatient(
  token: string,
  formData: PartialPatientFormData,
  language: string,
  telegramChatId: string,
): Promise<any> {
  if (!token) {
    throw new Error("Missing token");
  }

  // Create a complete form data object with all required fields
  const completeFormData: any = {
    firstName: formData.firstName || "",
    lastName: formData.lastName || "",
    dob: formData.dob || "",
    city: formData.city || "",
    phone: formData.phone || { countryCode: "", phoneNumber: "" },
    country: formData.country || "",
    genderPreference: formData.genderPreference || "",
    chiefComplaint: formData.chiefComplaint || "",
    currentMeds: formData.currentMeds || "",
    isPatient: formData.isPatientFields?.isPatient || false,
    patientRelation: formData.isPatientFields?.patientRelation || "",
    hasSubmittedInfo: true, // Always mark as submitted when updating
    preferredLanguage: formData.preferredLanguage || language,
    telegramChatId: telegramChatId || "",
  };

  // Use the token for the API call
  console.log("Updating patient with token:", token);
  const response = await fetch(`/api/telegram-intake-form/${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(completeFormData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("API update error:", errorData);

    if (errorData.invalidId) {
      throw new Error("Invalid ID");
    }

    throw new Error(errorData.message || "Failed to update patient");
  }

  return await response.json();
}
