import { useState } from 'react';
import ProblemList from "@/components/ProblemList";
import ProblemForm from "@/components/ProblemForm";
import { useQuery } from "@tanstack/react-query";
import { Problem } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Home() {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: problems, isLoading, isError } = useQuery<Problem[]>({
    queryKey: ['/api/problems'],
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProblemForm 
            onClose={() => setIsAddFormOpen(false)} 
            mode="add"
          />
        </DialogContent>
      </Dialog>

      <div className="lg:flex lg:space-x-6">
        {isLoading ? (
          <div className="w-full flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="w-full flex justify-center items-center py-12">
            <p className="text-red-500">Failed to load problems. Please try again.</p>
          </div>
        ) : (
          <ProblemList 
            problems={problems || []} 
            searchTerm={searchTerm}
            onAddNew={() => setIsAddFormOpen(true)}
            onSearch={handleSearchChange}
          />
        )}
      </div>
    </div>
  );
}
