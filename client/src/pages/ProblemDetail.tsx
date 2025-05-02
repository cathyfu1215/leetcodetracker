import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Edit, Trash2, Puzzle, Lightbulb, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Problem } from "@shared/schema";
import { renderMarkdown } from "@/lib/markdown";
import ProblemForm from "@/components/ProblemForm";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function ProblemDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/problems/:id");
  const [activeTab, setActiveTab] = useState("problem");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Visibility state for each section - hidden by default
  const [showPatterns, setShowPatterns] = useState(false);
  const [showTricks, setShowTricks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
  const { toast } = useToast();
  
  const problemId = params?.id ? parseInt(params.id) : 0;
  console.log("Problem ID from route:", problemId);
  
  const { data: problem, isLoading, isError } = useQuery<Problem>({
    queryKey: ['/api/problems', problemId],
    queryFn: async () => {
      if (!problemId) {
        throw new Error("Invalid problem ID");
      }
      const response = await apiRequest('GET', `/api/problems/${problemId}`);
      return response.json();
    },
    enabled: !!problemId,
    onSuccess: (data) => {
      console.log("Fetched problem data:", data);
    },
    onError: (error) => {
      console.error("Error fetching problem data:", error);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/problems/${problemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problems'] });
      toast({
        title: "Problem deleted",
        description: "The problem has been deleted successfully.",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete problem: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError || !problem) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Problem</h2>
          <p className="text-slate-600">Unable to load problem details. Please try again.</p>
          <Button className="mt-4" onClick={() => setLocation("/")}>
            Return to Problem List
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProblemForm 
            problem={problem} 
            onClose={() => setIsEditDialogOpen(false)} 
            mode="edit"
          />
        </DialogContent>
      </Dialog>
      
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={problem.title}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
      
      {/* Header section with problem title and actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getDifficultyColor(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
            <h2 className="text-2xl font-semibold mt-2 text-slate-800 dark:text-slate-100">
              #{problem.leetcodeNumber}: {problem.title}
            </h2>
            <a 
              href={problem.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm flex items-center mt-1"
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              View on LeetCode
            </a>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditDialogOpen(true)}
              className="flex items-center"
            >
              <Edit className="mr-1.5 h-3 w-3" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex items-center text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              <Trash2 className="mr-1.5 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center">
            <Puzzle className="text-slate-400 mr-2 h-4 w-4" />
            <span>
              <span className="text-slate-500">Patterns: </span>
              <span>{problem.patterns?.map(p => p.name).join(", ") || "None"}</span>
            </span>
          </div>
          
          <div className="flex items-center">
            <Lightbulb className="text-slate-400 mr-2 h-4 w-4" />
            <span>
              <span className="text-slate-500">Tricks: </span>
              <span>{problem.tricks?.length || 0}</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Two column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: Problem content (60% width) */}
        <div className="lg:w-3/5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
          <h3 className="text-xl font-medium mb-4 text-slate-800 dark:text-slate-200">Problem</h3>
          <div className="prose max-w-none dark:text-slate-300">
            {problem.content ? renderMarkdown(problem.content) : <p>No content available.</p>}
            
            <h3 className="text-lg font-medium mt-6 mb-2 dark:text-slate-200">Constraints:</h3>
            <ul className="list-disc pl-5 space-y-1 dark:text-slate-300">
              {problem.constraints?.map((constraint, index) => (
                <li key={index}>{constraint}</li>
              ))}
            </ul>
            
            <h3 className="text-lg font-medium mt-6 mb-2 dark:text-slate-200">Examples:</h3>
            {problem.examples?.map((example, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4">
                <p className="font-medium dark:text-slate-200">Example {index + 1}:</p>
                <p className="dark:text-slate-300"><strong className="dark:text-slate-200">Input:</strong> {example.input}</p>
                <p className="dark:text-slate-300"><strong className="dark:text-slate-200">Output:</strong> {example.output}</p>
                {example.explanation && (
                  <p className="dark:text-slate-300"><strong className="dark:text-slate-200">Explanation:</strong> {example.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Right column: Patterns, Tricks, Notes (40% width) */}
        <div className="lg:w-2/5 space-y-6">
          {/* Patterns section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">Patterns</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowPatterns(!showPatterns)}
                className="h-8 w-8 rounded-full"
                title={showPatterns ? "Hide patterns" : "Show patterns"}
              >
                {showPatterns ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPatterns ? "Hide patterns" : "Show patterns"}</span>
              </Button>
            </div>
            {showPatterns && (
              <div className="space-y-4">
                {problem.patterns?.map((pattern, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 dark:bg-slate-800">
                    <h3 className="text-lg font-medium mb-2 dark:text-slate-200">{pattern.name}</h3>
                    <p className="text-slate-700 dark:text-slate-300">{pattern.description}</p>
                  </div>
                ))}
                
                {(!problem.patterns || problem.patterns.length === 0) && (
                  <p className="text-slate-500 dark:text-slate-400 italic">No patterns added yet.</p>
                )}
              </div>
            )}
            {!showPatterns && (
              <p className="text-slate-500 dark:text-slate-400 italic">Patterns are hidden. Click the eye icon to reveal.</p>
            )}
          </div>
          
          {/* Tricks section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">Tricks</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowTricks(!showTricks)}
                className="h-8 w-8 rounded-full"
                title={showTricks ? "Hide tricks" : "Show tricks"}
              >
                {showTricks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showTricks ? "Hide tricks" : "Show tricks"}</span>
              </Button>
            </div>
            {showTricks && (
              <div className="space-y-4">
                {problem.tricks?.map((trick, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 dark:bg-slate-800">
                    <h3 className="text-lg font-medium mb-2 dark:text-slate-200">{trick.name}</h3>
                    <p className="text-slate-700 dark:text-slate-300">{trick.description}</p>
                  </div>
                ))}
                
                {(!problem.tricks || problem.tricks.length === 0) && (
                  <p className="text-slate-500 dark:text-slate-400 italic">No tricks added yet.</p>
                )}
              </div>
            )}
            {!showTricks && (
              <p className="text-slate-500 dark:text-slate-400 italic">Tricks are hidden. Click the eye icon to reveal.</p>
            )}
          </div>
          
          {/* Notes section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">Notes</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNotes(!showNotes)}
                className="h-8 w-8 rounded-full"
                title={showNotes ? "Hide notes" : "Show notes"}
              >
                {showNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showNotes ? "Hide notes" : "Show notes"}</span>
              </Button>
            </div>
            {showNotes && (
              <div className="prose max-w-none dark:text-slate-300">
                {problem.notes ? (
                  renderMarkdown(problem.notes)
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 italic">No notes added yet.</p>
                )}
              </div>
            )}
            {!showNotes && (
              <p className="text-slate-500 dark:text-slate-400 italic">Notes are hidden. Click the eye icon to reveal.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
