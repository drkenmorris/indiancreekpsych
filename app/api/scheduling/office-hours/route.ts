import { officeHoursPost } from "@/lib/office-hours-handler";
export async function POST(request: Request) { return officeHoursPost(request); }
