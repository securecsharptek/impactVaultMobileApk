import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HelpCircle } from "lucide-react";

export default function HelpButton({ pageName }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(createPageUrl("Help") + `#${pageName}`)}
      className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
      title="Help & tips for this page"
    >
      <HelpCircle className="w-4 h-4 text-stone-400" />
    </button>
  );
}