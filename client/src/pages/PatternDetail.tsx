import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, ExternalLink, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Problem, Pattern } from "@shared/schema";
import { renderMarkdown } from "@/lib/markdown";
import { useToast } from "@/hooks/use-toast";

export default function PatternDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/patterns/:id");
  const { toast } = useToast();
  
  const patternId = params?.id || "";
  console.log("Pattern ID from URL:", patternId);
  
  // Fetch pattern details
  const { 
    data: pattern, 
    isLoading: isPatternLoading, 
    isError: isPatternError,
    error: patternError
  } = useQuery<Pattern>({
    queryKey: ['/api/patterns', patternId],
    queryFn: async () => {
      if (!patternId) throw new Error("Invalid pattern ID");
      console.log("Fetching pattern with ID:", patternId);
      
      try {
        const response = await apiRequest('GET', `/api/patterns/${patternId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error response:", errorData);
          throw new Error(`API returned ${response.status}: ${errorData.message || response.statusText}`);
        }
        const data = await response.json();
        console.log("Pattern data received:", data);
        return data;
      } catch (error) {
        console.error("Error fetching pattern:", error);
        throw error;
      }
    },
    enabled: !!patternId,
    onError: (error) => {
      console.error("Pattern query error:", error);
      toast({
        title: "Error loading pattern",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  // Fetch related problems
  const {
    data: relatedProblems,
    isLoading: isProblemsLoading,
    isError: isProblemsError,
    error: problemsError
  } = useQuery<Problem[]>({
    queryKey: ['/api/patterns', patternId, 'problems'],
    queryFn: async () => {
      if (!patternId) throw new Error("Invalid pattern ID");
      console.log("Fetching problems for pattern ID:", patternId);
      
      try {
        const response = await apiRequest('GET', `/api/patterns/${patternId}/problems`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error response:", errorData);
          throw new Error(`API returned ${response.status}: ${errorData.message || response.statusText}`);
        }
        const data = await response.json();
        console.log("Related problems received:", data);
        return data;
      } catch (error) {
        console.error("Error fetching related problems:", error);
        throw error;
      }
    },
    enabled: !!patternId,
    onError: (error) => {
      console.error("Problems query error:", error);
      toast({
        title: "Error loading related problems",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });
  
  const isLoading = isPatternLoading || isProblemsLoading;
  const isError = isPatternError || isProblemsError;
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError || !pattern) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Pattern</h2>
          <p className="text-slate-600 mb-2">
            Unable to load pattern details. Please try again.
          </p>
          <p className="text-sm text-slate-500 mb-4">
            {patternError ? `Error: ${patternError.message}` : 
             problemsError ? `Error loading problems: ${problemsError.message}` : 
             'Unknown error'}
          </p>
          <Button className="mt-4" onClick={() => setLocation("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <Button 
        variant="ghost" 
        className="mb-4 flex items-center text-slate-600 hover:text-slate-900"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>
      
      {/* Pattern header section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center">
              <Puzzle className="text-primary h-5 w-5 mr-2" />
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                {pattern.name}
              </h2>
            </div>
            <div className="text-slate-500 mt-1">
              Used in {pattern.usageCount || 0} problems
            </div>
          </div>
        </div>
        
        <div className="prose max-w-none dark:text-slate-300 mt-4">
          {pattern.description ? 
            renderMarkdown(pattern.description) : 
            <p className="text-slate-500 italic">No description available.</p>}
        </div>
      </div>
      
      {/* Related problems section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">
            Problems using this pattern
          </h3>
        </div>
        
        <div>
          {relatedProblems && relatedProblems.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {relatedProblems.map((problem) => (
                <li key={problem.leetcodeNumber} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-slate-500 font-mono mr-3">#{problem.leetcodeNumber}</span>
                      <Button 
                        variant="link" 
                        className="text-slate-800 dark:text-slate-200 font-medium hover:text-primary"
                        onClick={() => setLocation(`/problems/${problem.leetcodeNumber}`)}
                      >
                        {problem.title}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                      <a 
                        href={problem.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-slate-400 hover:text-primary"
                        aria-label={`Open ${problem.title} on LeetCode`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              <p>No problems are currently using this pattern.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}