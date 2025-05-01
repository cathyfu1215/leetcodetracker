import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Edit, Trash2, Puzzle, Lightbulb } from "lucide-react";
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
  
  const { toast } = useToast();
  
  const problemId = params?.id ? parseInt(params.id) : 0;
  
  const { data: problem, isLoading, isError } = useQuery<Problem>({
    queryKey: ['/api/problems', problemId],
    enabled: !!problemId,
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
      
      <div className="lg:flex lg:space-x-6">
        <div className="lg:w-2/3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                <h2 className="text-2xl font-semibold mt-2 text-slate-800 dark:text-slate-100">{problem.title}</h2>
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
          
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="border-b border-slate-200 w-full justify-start rounded-none bg-transparent">
                <TabsTrigger 
                  value="problem" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 rounded-none border-b-2 border-transparent px-4 pb-2"
                >
                  Problem
                </TabsTrigger>
                <TabsTrigger 
                  value="patterns" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 rounded-none border-b-2 border-transparent px-4 pb-2"
                >
                  Patterns
                </TabsTrigger>
                <TabsTrigger 
                  value="notes" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 rounded-none border-b-2 border-transparent px-4 pb-2"
                >
                  Notes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="problem" className="pt-4">
                <div className="prose max-w-none">
                  {problem.content ? renderMarkdown(problem.content) : <p>No content available.</p>}
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">Constraints:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {problem.constraints?.map((constraint, index) => (
                      <li key={index}>{constraint}</li>
                    ))}
                  </ul>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">Examples:</h3>
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
              </TabsContent>
              
              <TabsContent value="patterns" className="pt-4">
                <div className="space-y-6">
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
                
                <h3 className="text-lg font-medium mt-6 mb-2 dark:text-slate-200">Tricks</h3>
                <div className="space-y-4">
                  {problem.tricks?.map((trick, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 dark:bg-slate-800">
                      <h4 className="font-medium mb-1 dark:text-slate-200">{trick.name}</h4>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{trick.description}</p>
                    </div>
                  ))}
                  
                  {(!problem.tricks || problem.tricks.length === 0) && (
                    <p className="text-slate-500 italic">No tricks added yet.</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="pt-4">
                <div className="prose max-w-none">
                  {problem.notes ? (
                    renderMarkdown(problem.notes)
                  ) : (
                    <p className="text-slate-500 italic">No notes added yet.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
