import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Problem, Difficulty } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, Star, CheckSquare } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Helper function to extract problem number from LeetCode URL
function extractProblemNumber(url: string): string | null {
  if (!url) return null;
  
  // Try to match problem number from URL patterns
  // Example: https://leetcode.com/problems/two-sum/ (should extract "1" or problem id)
  // Or https://leetcode.com/problems/valid-palindrome-ii/
  
  // Try to extract from LeetCode URL by looking for problem numbers
  
  // Check for various URL patterns:
  // Pattern 1: Extract from query parameter like ?id=123
  const queryMatch = url.match(/[?&]id=(\d+)/);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }
  
  // Pattern 2: Direct number in the URL after problems/ like /problems/123/
  const numberMatch = url.match(/\/problems\/(\d+)/);
  if (numberMatch && numberMatch[1]) {
    return numberMatch[1];
  }
  
  // Pattern 3: Look for number prefixes in problem name like "124-valid-palindrome"
  const nameNumberMatch = url.match(/\/problems\/(\d+)-/);
  if (nameNumberMatch && nameNumberMatch[1]) {
    return nameNumberMatch[1];
  }
  
  // If we still can't find a number, check if we can extract from the URL fragment
  const hashMatch = url.match(/#\/problems\/(\d+)/);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1];
  }
  
  return null;
}

type ProblemListProps = {
  problems: Problem[];
  searchTerm: string;
  onAddNew: () => void;
  onSearch: (value: string) => void;
};

export default function ProblemList({ problems, searchTerm, onAddNew, onSearch }: ProblemListProps) {
  const [, setLocation] = useLocation();
  const [difficulty, setDifficulty] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [filterStarred, setFilterStarred] = useState<boolean>(false);
  const [filterCompleted, setFilterCompleted] = useState<boolean>(false);
  const { toast } = useToast();
  
  const handleProblemClick = (id: number) => {
    setLocation(`/problems/${id}`);
  };
  
  const toggleStarredMutation = useMutation({
    mutationFn: async ({ id, isStarred }: { id: number, isStarred: boolean }) => {
      await apiRequest('PATCH', `/api/problems/${id}`, {
        isStarred: !isStarred
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/problems'] });
      
      const newStarredState = !variables.isStarred;
      toast({
        title: newStarredState ? "Problem starred" : "Problem unstarred",
        description: `Problem has been ${newStarredState ? 'added to' : 'removed from'} your starred list.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update starred status: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number, isCompleted: boolean }) => {
      await apiRequest('PATCH', `/api/problems/${id}`, {
        isCompleted: !isCompleted
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/problems'] });
      
      const newCompletedState = !variables.isCompleted;
      toast({
        title: newCompletedState ? "Problem marked as completed" : "Problem marked as not completed",
        description: `Problem has been marked as ${newCompletedState ? 'completed' : 'not completed'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update completion status: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleToggleStar = (e: React.MouseEvent, problem: Problem) => {
    e.stopPropagation();
    toggleStarredMutation.mutate({ 
      id: problem.leetcodeNumber, 
      isStarred: problem.isStarred || false 
    });
  };
  
  const handleToggleCompleted = (e: React.MouseEvent, problem: Problem) => {
    e.stopPropagation();
    toggleCompletedMutation.mutate({ 
      id: problem.leetcodeNumber, 
      isCompleted: problem.isCompleted || false 
    });
  };

  const filteredProblems = useMemo(() => {
    return problems
      .filter(problem => {
        const matchesSearch = 
          problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          problem.patterns.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesDifficulty = 
          difficulty === "all" || 
          problem.difficulty === difficulty;
        
        // If filterStarred is true, only show starred problems
        const matchesStarred = 
          !filterStarred || (problem.isStarred === true);
          
        // If filterCompleted is true, only show completed problems
        const matchesCompleted = 
          !filterCompleted || (problem.isCompleted === true);
        
        return matchesSearch && matchesDifficulty && matchesStarred && matchesCompleted;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "latest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "a-z":
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
  }, [problems, searchTerm, difficulty, sortBy, filterStarred, filterCompleted]);

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
    <div className="lg:w-[70%] mb-6 lg:mb-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Problems ({filteredProblems.length})
          </h2>
          <div className="flex mt-2 flex-wrap gap-2">
            {filterStarred && (
              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                <Star className="h-3 w-3 mr-1" /> Starred
              </div>
            )}
            {filterCompleted && (
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                <CheckSquare className="h-3 w-3 mr-1" /> Completed
              </div>
            )}
            {difficulty !== "all" && (
              <div className={`text-xs px-2 py-0.5 rounded-full flex items-center ${
                difficulty === "Easy" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300" :
                difficulty === "Medium" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300" :
                "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300"
              }`}>
                {difficulty}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select
            value={difficulty}
            onValueChange={setDifficulty}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="a-z">A-Z</SelectItem>
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={filterStarred ? "default" : "outline"} 
                  size="icon"
                  className={`h-9 w-9 ${
                    filterStarred 
                      ? "bg-amber-500 hover:bg-amber-600 shadow-sm scale-105" 
                      : "hover:bg-amber-100 hover:border-amber-300"
                  } transition-all duration-200`}
                  onClick={() => setFilterStarred(!filterStarred)}
                >
                  <Star 
                    className={`h-4 w-4 ${filterStarred ? "text-white" : "text-amber-500"}`} 
                    fill={filterStarred ? "white" : "none"} 
                    strokeWidth={filterStarred ? 2.5 : 1.8}
                  />
                  <span className="sr-only">Filter starred</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{filterStarred ? "Show all problems" : "Filter to show only starred problems"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={filterCompleted ? "default" : "outline"} 
                  size="icon"
                  className={`h-9 w-9 ${
                    filterCompleted 
                      ? "bg-green-500 hover:bg-green-600 shadow-sm scale-105" 
                      : "hover:bg-green-100 hover:border-green-300"
                  } transition-all duration-200`}
                  onClick={() => setFilterCompleted(!filterCompleted)}
                >
                  <CheckSquare 
                    className={`h-4 w-4 ${filterCompleted ? "text-white" : "text-green-500"}`} 
                    fill={filterCompleted ? "white" : "none"} 
                    strokeWidth={filterCompleted ? 2.5 : 1.8}
                  />
                  <span className="sr-only">Filter completed</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{filterCompleted ? "Show all problems" : "Filter to show only completed problems"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search problems..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden dark:bg-slate-900 dark:border-slate-700">
        <CardContent className="p-0">
          {filteredProblems.length > 0 ? (
            filteredProblems.map((problem) => (
              <div
                key={problem.leetcodeNumber} // Use leetcodeNumber as the unique key
                className="border-b border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer relative"
                onClick={() => handleProblemClick(problem.leetcodeNumber)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium dark:text-slate-200">
                        <span className="text-primary-600 dark:text-primary-400 mr-2">
                          #{problem.leetcodeNumber}
                        </span>
                        {problem.title}
                      </h3>
                      
                      <div className="ml-2 flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${
                                  problem.isStarred 
                                    ? "bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-700/50" 
                                    : "hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                } transition-all duration-150 transform hover:scale-110 hover:shadow-sm`}
                                onClick={(e) => handleToggleStar(e, problem)}
                                disabled={toggleStarredMutation.isPending}
                              >
                                <Star 
                                  className={`h-4 w-4 ${problem.isStarred 
                                    ? "text-amber-500 fill-amber-500" 
                                    : "text-slate-400 hover:text-amber-400"}`} 
                                  strokeWidth={problem.isStarred ? 2 : 1.8}
                                />
                                <span className="sr-only">
                                  {problem.isStarred ? "Unstar" : "Star"}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{problem.isStarred ? "Remove from starred" : "Add to starred"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${
                                  problem.isCompleted 
                                    ? "bg-green-100 dark:bg-green-900/30 ring-1 ring-green-200 dark:ring-green-700/50" 
                                    : "hover:bg-green-50 dark:hover:bg-green-900/20"
                                } transition-all duration-150 transform hover:scale-110 hover:shadow-sm`}
                                onClick={(e) => handleToggleCompleted(e, problem)}
                                disabled={toggleCompletedMutation.isPending}
                              >
                                <CheckSquare 
                                  className={`h-4 w-4 ${problem.isCompleted 
                                    ? "text-green-500 fill-green-500 stroke-white animate-checkmark-pop" 
                                    : "text-slate-400 hover:text-green-400"}`} 
                                  strokeWidth={problem.isCompleted ? 2.5 : 1.8}
                                />
                                <span className="sr-only">
                                  {problem.isCompleted ? "Mark incomplete" : "Mark complete"}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{problem.isCompleted ? "Mark as not completed" : "Mark as completed"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-1.5">
                      {problem.patterns?.map((pattern, index) => (
                        <span key={`pattern-${index}`} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full px-2 py-0.5 text-xs">
                          {pattern.name}
                        </span>
                      ))}
                      {problem.tricks?.map((trick, index) => (
                        <span key={`trick-${index}`} className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full px-2 py-0.5 text-xs">
                          {trick.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-4">No problems found matching your criteria.</p>
              <button
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                onClick={onAddNew}
              >
                Add your first problem
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
