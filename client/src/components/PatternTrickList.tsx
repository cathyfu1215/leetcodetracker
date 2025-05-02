import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Pattern, Trick } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

export default function PatternTrickList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('patterns');

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

  // Filter patterns based on search term
  const filteredPatterns = patterns.filter(pattern =>
    pattern.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter tricks based on search term
  const filteredTricks = tricks.filter(trick =>
    trick.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort patterns and tricks by usageCount (most used first)
  const sortedPatterns = [...filteredPatterns].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  const sortedTricks = [...filteredTricks].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

  const isLoading = activeTab === 'patterns' ? isPatternsLoading : isTricksLoading;
  const isError = activeTab === 'patterns' ? isPatternsError : isTricksError;

  return (
    <div className="lg:w-[30%]">
      <Card className="dark:bg-slate-900 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <CardTitle className="text-lg">Patterns & Tricks</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patterns">Patterns</TabsTrigger>
                <TabsTrigger value="tricks">Tricks</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Search ${activeTab}...`}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center py-6">
              <p className="text-red-500 text-sm">Failed to load data</p>
            </div>
          ) : (
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="patterns" className="mt-0">
                {sortedPatterns.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {sortedPatterns.map((pattern) => (
                      <div
                        key={pattern.id}
                        className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        onClick={() => pattern.id && handlePatternClick(pattern.id)}
                      >
                        <span className="font-medium text-sm dark:text-slate-200 truncate pr-2">{pattern.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 whitespace-nowrap">
                          {pattern.problems?.length || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No patterns found</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="tricks" className="mt-0">
                {sortedTricks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {sortedTricks.map((trick) => (
                      <div
                        key={trick.id}
                        className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        onClick={() => trick.id && handleTrickClick(trick.id)}
                      >
                        <span className="font-medium text-sm dark:text-slate-200 truncate pr-2">{trick.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 whitespace-nowrap">
                          {trick.problems?.length || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No tricks found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}