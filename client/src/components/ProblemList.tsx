import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
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
import { Search } from 'lucide-react';

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
  
  const handleProblemClick = (id: number) => {
    setLocation(`/problems/${id}`);
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
        
        return matchesSearch && matchesDifficulty;
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
  }, [problems, searchTerm, difficulty, sortBy]);

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
    <div className="lg:w-1/3 mb-6 lg:mb-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Problems ({filteredProblems.length})
        </h2>
        
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
                key={problem.id}
                className="border-b border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => handleProblemClick(problem.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium dark:text-slate-200">
                      {extractProblemNumber(problem.url) && (
                        <span className="text-primary-600 dark:text-primary-400 mr-2">
                          #{extractProblemNumber(problem.url)}
                        </span>
                      )}
                      {problem.title}
                    </h3>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-1.5">
                      {problem.patterns?.slice(0, 2).map((pattern, index) => (
                        <span key={index} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full px-2 py-0.5">
                          {pattern.name}
                        </span>
                      ))}
                      {problem.patterns && problem.patterns.length > 2 && (
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full px-2 py-0.5">
                          +{problem.patterns.length - 2}
                        </span>
                      )}
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
