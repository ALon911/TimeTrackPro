import { SummaryInsights } from "@/components/summary-insights";
import { MobileHeader } from "@/components/mobile-header";
import { MobileNavigation } from "@/components/mobile-navigation";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 mb-16 md:mb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 dark:text-white">סקירה ותובנות</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            קבל תובנות אישיות והמלצות לשיפור הפרודוקטיביות שלך
          </p>
        </div>
        
        {/* Summary & Insights Component */}
        <SummaryInsights />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}
