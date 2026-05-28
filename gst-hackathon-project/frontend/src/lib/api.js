import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8005",
  timeout: 120000,
});

function buildMultipart(files) {
  const formData = new FormData();
  Object.entries(files).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file, file.name);
    }
  });
  return formData;
}

function uploadProgressHandler(onProgress) {
  return (event) => {
    if (!onProgress || !event.total) {
      return;
    }

    const percentage = Math.min(88, Math.max(12, Math.round((event.loaded / event.total) * 78)));
    onProgress(percentage);
  };
}

export async function getHealth() {
  const response = await client.get("/health");
  return response.data;
}

export async function reconcile({ purchaseFile, gstrFile, params, onProgress }) {
  const response = await client.post("/reconcile", buildMultipart({ purchase: purchaseFile, gstr: gstrFile }), {
    params,
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: uploadProgressHandler(onProgress),
  });
  return response.data;
}

export async function runItcEligibility(payload) {
  const response = await client.post("/api/v1/modules/itc-eligibility", payload);
  return response.data;
}

export async function runVendorRisk(payload) {
  const response = await client.post("/api/v1/modules/vendor-risk", payload);
  return response.data;
}

export async function runInvoiceCompliance({ purchaseFile, params, onProgress }) {
  const response = await client.post("/api/v1/modules/invoice-compliance", buildMultipart({ purchase: purchaseFile }), {
    params,
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: uploadProgressHandler(onProgress),
  });
  return response.data;
}

export async function askCopilot(payload) {
  const response = await client.post("/ai-chat", payload);
  return response.data;
}
