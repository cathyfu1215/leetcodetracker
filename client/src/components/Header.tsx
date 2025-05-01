import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, LucideLayoutGrid } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ProblemForm from './ProblemForm';

export default function Header() {
  const [, setLocation] = useLocation();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
  const handleNavigateHome = () => {
    setLocation('/');
  };
  
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div 
          className="flex items-center space-x-2 cursor-pointer" 
          onClick={handleNavigateHome}
        >
          <LucideLayoutGrid className="w-7 h-7 text-primary-600" />
          <h1 className="text-xl font-semibold text-slate-800">LeetTracker</h1>
        </div>
        
        <Button 
          onClick={() => setIsAddFormOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white flex items-center"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Problem
        </Button>
      </div>
      
      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProblemForm 
            onClose={() => setIsAddFormOpen(false)} 
            mode="add"
          />
        </DialogContent>
      </Dialog>
    </header>
  );
}
