export function validateBookingInput(body = {}) {
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const serviceId = String(body.serviceId || "").trim();
  const address = String(body.address || "").trim();
  const problem = String(body.problem || "").trim();
  if (name.length < 2) return "নাম কমপক্ষে ২ অক্ষরের হতে হবে।";
  if (!/^\+?[0-9\s()-]{8,18}$/.test(phone)) return "সঠিক ফোন নম্বর দিন।";
  if (!serviceId) return "সার্ভিস নির্বাচন করুন।";
  if (address.length < 5) return "পূর্ণ ঠিকানা দিন।";
  if (problem.length < 5) return "সমস্যার বিবরণ দিন।";
  return null;
}
