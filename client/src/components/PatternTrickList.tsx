import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Pattern, Trick } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define color classes for patterns
const PATTERN_COLORS = [
  'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800',
  'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800',
  'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-100 hover:bg-cyan-200 dark:hover:bg-cyan-800',
  'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-100 hover:bg-teal-200 dark:hover:bg-teal-800',
  'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-800',
];

// Define color classes for tricks
const TRICK_COLORS = [
  'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-800',
  'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-100 hover:bg-pink-200 dark:hover:bg-pink-800',
  'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-100 hover:bg-rose-200 dark:hover:bg-rose-800',
  'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800',
  'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-800',
];

export default function PatternTrickList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'patterns' | 'tricks'>('all');

  // Fetch patterns data
  const { 
    data: patterns = [], 
    isLoading: isPatternsLoading, 
    isError: isPatternsError 
  } = useQuery<Pattern[]>({
    queryKey: ['/api/patterns'],
  });

  // Fetch tricks data
  const { 
    data: tricks = [], 
    isLoading: isTricksLoading, 
    isError: isTricksError 
  } = useQuery<Trick[]>({
    queryKey: ['/api/tricks'],
  });

  const handlePatternClick = (id: string) => {
    setLocation(`/patterns/${id}`);
  };

  const handleTrickClick = (id: string) => {
    setLocation(`/tricks/${id}`);
  };

  // Filter patterns and tricks based on search term
  const filteredPatterns = patterns.filter(pattern =>
    pattern.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTricks = tricks.filter(trick =>
    trick.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort patterns and tricks by usageCount (most used first)
  const sortedPatterns = [...filteredPatterns].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  const sortedTricks = [...filteredTricks].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

  // Assign colors to patterns and tricks
  const patternsWithColors = useMemo(() => {
    return sortedPatterns.map((pattern, index) => ({
      ...pattern,
      colorClass: PATTERN_COLORS[index % PATTERN_COLORS.length],
      badgeColorClass: PATTERN_COLORS[index % PATTERN_COLORS.length].split(' ')[0].replace('100', '200').replace('900', '800')
    }));
  }, [sortedPatterns]);

  const tricksWithColors = useMemo(() => {
    return sortedTricks.map((trick, index) => ({
      ...trick,
      colorClass: TRICK_COLORS[index % TRICK_COLORS.length],
      badgeColorClass: TRICK_COLORS[index % TRICK_COLORS.length].split(' ')[0].replace('100', '200').replace('900', '800')
    }));
  }, [sortedTricks]);

  const isLoading = isPatternsLoading || isTricksLoading;
  const isError = isPatternsError || isTricksError;

  return (
    <div className="lg:w-[30%]">
      <Card className="dark:bg-slate-900 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Patterns & Tricks</CardTitle>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patterns & tricks..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3">
          <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'patterns' | 'tricks')}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="tricks">Tricks</TabsTrigger>
            </TabsList>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="flex justify-center items-center py-6">
                <p className="text-red-500 text-sm">Failed to load data</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <TabsContent value="all" className="w-full mt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {/* Patterns */}
                    {patternsWithColors.map((pattern) => (
                      <div 
                        key={pattern.id}
                        onClick={() => pattern.id && handlePatternClick(pattern.id)}
                        className={`inline-flex items-center gap-1 cursor-pointer ${pattern.colorClass} text-xs px-2 py-0.5 rounded-full`}
                      >
                        <span className="truncate max-w-[120px]">{pattern.name}</span>
                        <span className={`inline-flex items-center justify-center ${pattern.badgeColorClass} dark:bg-opacity-50 rounded-full w-4 h-4 text-[10px]`}>
                          {pattern.problems?.length || 0}
                        </span>
                      </div>
                    ))}
                    
                    {/* Tricks */}
                    {tricksWithColors.map((trick) => (
                      <div 
                        key={trick.id}
                        onClick={() => trick.id && handleTrickClick(trick.id)}
                        className={`inline-flex items-center gap-1 cursor-pointer ${trick.colorClass} text-xs px-2 py-0.5 rounded-full`}
                      >
                        <span className="truncate max-w-[120px]">{trick.name}</span>
                        <span className={`inline-flex items-center justify-center ${trick.badgeColorClass} dark:bg-opacity-50 rounded-full w-4 h-4 text-[10px]`}>
                          {trick.problems?.length || 0}
                        </span>
                      </div>
                    ))}
                    
                    {patternsWithColors.length === 0 && tricksWithColors.length === 0 && (
                      <div className="w-full p-4 text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No patterns or tricks found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="patterns" className="w-full mt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {patternsWithColors.map((pattern) => (
                      <div 
                        key={pattern.id}
                        onClick={() => pattern.id && handlePatternClick(pattern.id)}
                        className={`inline-flex items-center gap-1 cursor-pointer ${pattern.colorClass} text-xs px-2 py-0.5 rounded-full`}
                      >
                        <span className="truncate max-w-[140px]">{pattern.name}</span>
                        <span className={`inline-flex items-center justify-center ${pattern.badgeColorClass} dark:bg-opacity-50 rounded-full w-4 h-4 text-[10px]`}>
                          {pattern.problems?.length || 0}
                        </span>
                      </div>
                    ))}
                    
                    {patternsWithColors.length === 0 && (
                      <div className="w-full p-4 text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No patterns found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tricks" className="w-full mt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {tricksWithColors.map((trick) => (
                      <div 
                        key={trick.id}
                        onClick={() => trick.id && handleTrickClick(trick.id)}
                        className={`inline-flex items-center gap-1 cursor-pointer ${trick.colorClass} text-xs px-2 py-0.5 rounded-full`}
                      >
                        <span className="truncate max-w-[140px]">{trick.name}</span>
                        <span className={`inline-flex items-center justify-center ${trick.badgeColorClass} dark:bg-opacity-50 rounded-full w-4 h-4 text-[10px]`}>
                          {trick.problems?.length || 0}
                        </span>
                      </div>
                    ))}
                    
                    {tricksWithColors.length === 0 && (
                      <div className="w-full p-4 text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No tricks found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}