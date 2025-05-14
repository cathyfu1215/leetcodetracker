import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, CheckCircle, XCircle, Check, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Problem, insertProblemSchema, patternSchema, trickSchema, exampleSchema, difficultyEnum, PatternReference, TrickReference, ProblemReference } from "@shared/schema";
import { useLocation } from "wouter";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Define interfaces for Pattern and Trick
interface Pattern {
  id?: string;
  name: string;
  description: string;
  usageCount?: number;
  problems?: ProblemReference[];
}

interface Trick {
  id?: string;
  name: string;
  description: string; 
  usageCount?: number;
  problems?: ProblemReference[];
}

interface ProblemFormProps {
  problem?: Problem;
  onClose: () => void;
  mode: "add" | "edit";
}

// Define the type explicitly to avoid type inference issues
type FormValues = z.infer<typeof insertProblemSchema>;

// Form validation schema based on our data model
const formSchema = insertProblemSchema
  .extend({
    // Additional client-side validations can go here
    url: z.string().url("Please enter a valid URL"),
  })
  .refine(
    (data) => 
      // Make sure we have at least empty arrays for all array fields
      data.constraints && 
      data.examples && 
      data.patterns && 
      data.tricks,
    {
      message: "Missing required array fields",
    }
  );

export default function ProblemForm({ problem, onClose, mode }: ProblemFormProps) {
  const [tab, setTab] = useState("basic");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [leetcodeNumberStatus, setLeetcodeNumberStatus] = useState<"valid" | "invalid" | "checking" | null>(null);
  const [confirmedConstraints, setConfirmedConstraints] = useState<Record<number, boolean>>({});
  const [confirmedExamples, setConfirmedExamples] = useState<Record<number, boolean>>({});
  const [confirmedPatterns, setConfirmedPatterns] = useState<Record<number, boolean>>({});
  const [confirmedTricks, setConfirmedTricks] = useState<Record<number, boolean>>({});
  
  // Updated search state variables
  const [patternSearchQuery, setPatternSearchQuery] = useState("");
  const [trickSearchQuery, setTrickSearchQuery] = useState("");
  const [patternSuggestions, setPatternSuggestions] = useState<Pattern[]>([]);
  const [trickSuggestions, setTrickSuggestions] = useState<Trick[]>([]);
  const [isPatternSearching, setIsPatternSearching] = useState(false);
  const [isTrickSearching, setIsTrickSearching] = useState(false);
  const [showPatternResults, setShowPatternResults] = useState(false);
  const [showTrickResults, setShowTrickResults] = useState(false);
  
  // Refs for dropdown handling
  const patternSearchRef = useRef<HTMLDivElement>(null);
  const trickSearchRef = useRef<HTMLDivElement>(null);
  
  // State for new pattern/trick creation modal
  const [isCreatingNewPattern, setIsCreatingNewPattern] = useState(false);
  const [isCreatingNewTrick, setIsCreatingNewTrick] = useState(false);
  const [newPatternName, setNewPatternName] = useState("");
  const [newPatternDescription, setNewPatternDescription] = useState("");
  const [newTrickName, setNewTrickName] = useState("");
  const [newTrickDescription, setNewTrickDescription] = useState("");
  const [isSubmittingNewPattern, setIsSubmittingNewPattern] = useState(false);
  const [isSubmittingNewTrick, setIsSubmittingNewTrick] = useState(false);
  
  // Update the default values for constraints and examples to be empty arrays
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: problem ? {
      title: problem.title || "",
      url: problem.url || "",
      leetcodeNumber: problem.leetcodeNumber || 0, // Ensure default value is 0
      content: problem.content || "",
      constraints: problem.constraints || [],
      examples: problem.examples || [],
      patterns: problem.patterns || [],
      tricks: problem.tricks || [],
      notes: problem.notes || "",
      difficulty: problem.difficulty || "Medium"
    } : {
      title: "",
      url: "",
      leetcodeNumber: 0, // Ensure default value is 0
      content: "",
      constraints: [],
      examples: [],
      patterns: [],
      tricks: [],
      notes: "",
      difficulty: "Medium"
    }
  });

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patternSearchRef.current && !patternSearchRef.current.contains(event.target as Node)) {
        setShowPatternResults(false);
      }
      if (trickSearchRef.current && !trickSearchRef.current.contains(event.target as Node)) {
        setShowTrickResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch pattern suggestions when search query changes
  useEffect(() => {
    const fetchPatternSuggestions = async () => {
      if (patternSearchQuery.length < 2) {
        setPatternSuggestions([]);
        return;
      }
      
      setIsPatternSearching(true);
      
      try {
        const response = await apiRequest(
          "GET", 
          `/api/patterns/search?q=${encodeURIComponent(patternSearchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPatternSuggestions(data);
          setShowPatternResults(true);
        }
      } catch (error) {
        console.error("Error fetching pattern suggestions:", error);
      } finally {
        setIsPatternSearching(false);
      }
    };
    
    const timeoutId = setTimeout(fetchPatternSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [patternSearchQuery]);
  
  // Fetch trick suggestions when search query changes
  useEffect(() => {
    const fetchTrickSuggestions = async () => {
      if (trickSearchQuery.length < 2) {
        setTrickSuggestions([]);
        return;
      }
      
      setIsTrickSearching(true);
      
      try {
        const response = await apiRequest(
          "GET", 
          `/api/tricks/search?q=${encodeURIComponent(trickSearchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setTrickSuggestions(data);
          setShowTrickResults(true);
        }
      } catch (error) {
        console.error("Error fetching trick suggestions:", error);
      } finally {
        setIsTrickSearching(false);
      }
    };
    
    const timeoutId = setTimeout(fetchTrickSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [trickSearchQuery]);

  const checkLeetcodeNumber = async (number: number) => {
    setLeetcodeNumberStatus("checking");
    try {
      const response = await apiRequest("GET", `/api/problems/${number}`);
      if (response.ok) {
        setLeetcodeNumberStatus("invalid");
      } else {
        setLeetcodeNumberStatus("valid");
      }
    } catch {
      setLeetcodeNumberStatus("valid");
    }
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "leetcodeNumber" && value.leetcodeNumber) {
        checkLeetcodeNumber(value.leetcodeNumber);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Set up field arrays for repeating elements
  // @ts-ignore - Working around React Hook Form typings
  const { 
    fields: constraintFields, 
    append: appendConstraint, 
    remove: removeConstraint, 
    update: updateConstraint 
  } = useFieldArray({
    control: form.control,
    name: "constraints"
  });

  // Removed validation from the Add Constraint button and moved it to the Confirm button.
  const handleAddConstraint = () => {
    appendConstraint("" as any); // Always append an empty string when adding a new constraint
  };

  const { 
    fields: exampleFields, 
    append: appendExample, 
    remove: removeExample, 
    update: updateExample 
  } = useFieldArray({
    control: form.control,
    name: "examples" as const
  });

  const { 
    fields: patternFields, 
    append: appendPattern, 
    remove: removePattern, 
    update: updatePattern 
  } = useFieldArray({
    control: form.control,
    name: "patterns" as const
  });

  const { 
    fields: trickFields, 
    append: appendTrick, 
    remove: removeTrick, 
    update: updateTrick 
  } = useFieldArray({
    control: form.control,
    name: "tricks" as const
  });

  // Add mutation for creating/updating problems
  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Use leetcodeNumber as the unique identifier
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
        createdAt: mode === "add" ? new Date().toISOString() : problem?.createdAt
      };

      if (mode === "add") {
        return apiRequest("POST", "/api/problems", payload);
      } else {
        return apiRequest("PATCH", `/api/problems/${problem!.leetcodeNumber}`, payload);
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/problems'] });

      if (mode === "add") {
        response.json().then(newProblem => {
          toast({
            title: "Problem added",
            description: "Your problem has been successfully added.",
          });
          onClose();
          setLocation(`/problems/${newProblem.leetcodeNumber}`);
        });
      } else {
        toast({
          title: "Problem updated",
          description: "Your problem has been successfully updated.",
        });
        onClose();
        // Invalidate the specific problem query
        queryClient.invalidateQueries({ queryKey: ['/api/problems', problem!.leetcodeNumber] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${mode === "add" ? "add" : "update"} problem: ${error}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  // Helper function to add a pattern from suggestions
  const handlePatternSelect = (pattern: Pattern) => {
    const patternReference: PatternReference = {
      id: pattern.id as string,
      name: pattern.name,
      description: pattern.description
    };
    
    // Check if pattern already exists in the form
    const patterns = form.getValues("patterns");
    const exists = patterns.some(p => p.id === pattern.id);
    
    if (!exists) {
      appendPattern(patternReference);
      setConfirmedPatterns(prev => ({
        ...prev,
        [patternFields.length]: true
      }));
      
      // Update the pattern in the database to connect it to this problem
      updatePatternProblemConnection(pattern.id as string, true);
      
      toast({
        title: "Pattern added",
        description: `${pattern.name} has been successfully added to this problem.`,
      });
    } else {
      toast({
        title: "Pattern already exists",
        description: `${pattern.name} is already added to this problem.`,
        variant: "destructive",
      });
    }
    
    setPatternSearchQuery("");
    setShowPatternResults(false);
  };
  
  // Helper function to add a trick from suggestions
  const handleTrickSelect = (trick: Trick) => {
    const trickReference: TrickReference = {
      id: trick.id as string,
      name: trick.name,
      description: trick.description
    };
    
    // Check if trick already exists in the form
    const tricks = form.getValues("tricks");
    const exists = tricks.some(t => t.id === trick.id);
    
    if (!exists) {
      appendTrick(trickReference);
      setConfirmedTricks(prev => ({
        ...prev,
        [trickFields.length]: true
      }));
      
      // Update the trick in the database to connect it to this problem
      updateTrickProblemConnection(trick.id as string, true);
      
      toast({
        title: "Trick added",
        description: `${trick.name} has been successfully added to this problem.`,
      });
    } else {
      toast({
        title: "Trick already exists",
        description: `${trick.name} is already added to this problem.`,
        variant: "destructive",
      });
    }
    
    setTrickSearchQuery("");
    setShowTrickResults(false);
  };
  
  // Helper function to create new pattern
  const handleCreateNewPattern = (e: React.MouseEvent) => {
    // Prevent event bubbling which might cause the dialog to close immediately
    e.preventDefault();
    e.stopPropagation();
    
    if (patternSearchQuery.trim().length === 0) {
      toast({
        title: "Empty pattern name",
        description: "Please enter a pattern name to create.",
        variant: "destructive",
      });
      return;
    }
    
    setNewPatternName(patternSearchQuery.trim());
    setNewPatternDescription("");
    setIsCreatingNewPattern(true);
  };
  
  // Helper function to submit new pattern with description
  const handleSubmitNewPattern = async (e: React.FormEvent) => {
    // Prevent form submission which might cause page refresh or dialog close
    e.preventDefault();
    
    if (!newPatternName.trim()) {
      toast({
        title: "Empty pattern name",
        description: "Pattern name is required.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmittingNewPattern(true);
    
    try {
      // Create a problem reference for the current problem
      const problemRef: ProblemReference = {
        leetcodeNumber: form.getValues("leetcodeNumber"),
        title: form.getValues("title")
      };
      
      // Create the pattern with the problem reference
      const response = await apiRequest("POST", "/api/patterns", {
        name: newPatternName,
        description: newPatternDescription,
        problems: [problemRef]
      });
      
      if (response.ok) {
        const newPattern = await response.json();
        
        // Add the pattern to the problem
        const patternReference: PatternReference = {
          id: newPattern.id as string,
          name: newPattern.name,
          description: newPattern.description
        };
        
        appendPattern(patternReference);
        setConfirmedPatterns(prev => ({
          ...prev,
          [patternFields.length]: true
        }));
        
        toast({
          title: "New pattern created",
          description: `'${newPattern.name}' has been created and added to this problem.`,
        });
        
        setIsCreatingNewPattern(false);
        setPatternSearchQuery("");
        setShowPatternResults(false);
      }
    } catch (error) {
      console.error("Error creating pattern:", error);
      toast({
        title: "Error",
        description: "Failed to create new pattern.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingNewPattern(false);
    }
  };
  
  // Helper function to create new trick
  const handleCreateNewTrick = (e: React.MouseEvent) => {
    // Prevent event bubbling which might cause the dialog to close immediately
    e.preventDefault();
    e.stopPropagation();
    
    if (trickSearchQuery.trim().length === 0) {
      toast({
        title: "Empty trick name",
        description: "Please enter a trick name to create.",
        variant: "destructive",
      });
      return;
    }
    
    setNewTrickName(trickSearchQuery.trim());
    setNewTrickDescription("");
    setIsCreatingNewTrick(true);
  };
  
  // Helper function to submit new trick with description
  const handleSubmitNewTrick = async (e: React.FormEvent) => {
    // Prevent form submission which might cause page refresh or dialog close
    e.preventDefault();
    
    if (!newTrickName.trim()) {
      toast({
        title: "Empty trick name",
        description: "Trick name is required.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmittingNewTrick(true);
    
    try {
      // Create a problem reference for the current problem
      const problemRef: ProblemReference = {
        leetcodeNumber: form.getValues("leetcodeNumber"),
        title: form.getValues("title")
      };
      
      // Create the trick with the problem reference
      const response = await apiRequest("POST", "/api/tricks", {
        name: newTrickName,
        description: newTrickDescription,
        problems: [problemRef]
      });
      
      if (response.ok) {
        const newTrick = await response.json();
        
        // Add the trick to the problem
        const trickReference: TrickReference = {
          id: newTrick.id as string,
          name: newTrick.name,
          description: newTrick.description
        };
        
        appendTrick(trickReference);
        setConfirmedTricks(prev => ({
          ...prev,
          [trickFields.length]: true
        }));
        
        toast({
          title: "New trick created",
          description: `'${newTrick.name}' has been created and added to this problem.`,
        });
        
        setIsCreatingNewTrick(false);
        setTrickSearchQuery("");
        setShowTrickResults(false);
      }
    } catch (error) {
      console.error("Error creating trick:", error);
      toast({
        title: "Error",
        description: "Failed to create new trick.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingNewTrick(false);
    }
  };
  
  // Helper function to update the pattern-problem connection
  const updatePatternProblemConnection = async (patternId: string, isAdding: boolean) => {
    try {
      const problemRef: ProblemReference = {
        leetcodeNumber: form.getValues("leetcodeNumber"),
        title: form.getValues("title")
      };
      
      if (isAdding) {
        // Add problem reference to pattern
        await apiRequest("PATCH", `/api/patterns/${patternId}/problems`, { 
          action: "add", 
          problem: problemRef 
        });
      } else {
        // Remove problem reference from pattern
        await apiRequest("PATCH", `/api/patterns/${patternId}/problems`, { 
          action: "remove", 
          leetcodeNumber: problemRef.leetcodeNumber 
        });
      }
    } catch (error) {
      console.error("Error updating pattern-problem connection:", error);
    }
  };
  
  // Helper function to update the trick-problem connection
  const updateTrickProblemConnection = async (trickId: string, isAdding: boolean) => {
    try {
      const problemRef: ProblemReference = {
        leetcodeNumber: form.getValues("leetcodeNumber"),
        title: form.getValues("title")
      };
      
      if (isAdding) {
        // Add problem reference to trick
        await apiRequest("PATCH", `/api/tricks/${trickId}/problems`, { 
          action: "add", 
          problem: problemRef 
        });
      } else {
        // Remove problem reference from trick
        await apiRequest("PATCH", `/api/tricks/${trickId}/problems`, { 
          action: "remove", 
          leetcodeNumber: problemRef.leetcodeNumber 
        });
      }
    } catch (error) {
      console.error("Error updating trick-problem connection:", error);
    }
  };
  
  // When removing a pattern, also update the pattern-problem connection
  const handleRemovePattern = (index: number) => {
    const pattern = form.getValues(`patterns.${index}`);
    if (pattern.id) {
      updatePatternProblemConnection(pattern.id, false);
    }
    
    removePattern(index);
    setConfirmedPatterns(prev => {
      const newState = {...prev};
      delete newState[index];
      return newState;
    });
  };
  
  // When removing a trick, also update the trick-problem connection
  const handleRemoveTrick = (index: number) => {
    const trick = form.getValues(`tricks.${index}`);
    if (trick.id) {
      updateTrickProblemConnection(trick.id, false);
    }
    
    removeTrick(index);
    setConfirmedTricks(prev => {
      const newState = {...prev};
      delete newState[index];
      return newState;
    });
  };

  // Modified function to save custom pattern to Firebase
  const handleConfirmCustomPattern = async (index: number) => {
    const name = form.getValues(`patterns.${index}.name`);
    const description = form.getValues(`patterns.${index}.description`);
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Pattern name is required.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First save the pattern to the patterns collection
      const response = await apiRequest("POST", "/api/patterns", {
        name: name.trim(),
        description: description || ""
      });
      
      if (response.ok) {
        const savedPattern = await response.json();
        
        // Update the form value with the saved pattern's ID
        const updatedPattern = {
          id: savedPattern.id,
          name: savedPattern.name,
          description: savedPattern.description
        };
        
        // Update the pattern in the form array
        updatePattern(index, updatedPattern);
        
        // Mark as confirmed
        setConfirmedPatterns(prev => ({
          ...prev,
          [index]: true
        }));
        
        toast({
          title: "Pattern added",
          description: "Your pattern has been successfully added and saved to the patterns collection.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save pattern to the collection.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding pattern:", error);
      toast({
        title: "Error",
        description: "Failed to save pattern.",
        variant: "destructive",
      });
    }
  };
  
  // Modified function to save custom trick to Firebase
  const handleConfirmCustomTrick = async (index: number) => {
    const name = form.getValues(`tricks.${index}.name`);
    const description = form.getValues(`tricks.${index}.description`);
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Trick name is required.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First save the trick to the tricks collection
      const response = await apiRequest("POST", "/api/tricks", {
        name: name.trim(),
        description: description || ""
      });
      
      if (response.ok) {
        const savedTrick = await response.json();
        
        // Update the form value with the saved trick's ID
        const updatedTrick = {
          id: savedTrick.id,
          name: savedTrick.name,
          description: savedTrick.description
        };
        
        // Update the trick in the form array
        updateTrick(index, updatedTrick);
        
        // Mark as confirmed
        setConfirmedTricks(prev => ({
          ...prev,
          [index]: true
        }));
        
        toast({
          title: "Trick added",
          description: "Your trick has been successfully added and saved to the tricks collection.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save trick to the collection.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding trick:", error);
      toast({
        title: "Error",
        description: "Failed to save trick.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "add" ? "Add Problem" : "Edit Problem"}</DialogTitle>
        <DialogDescription>
          {mode === "add" 
            ? "Add a new LeetCode problem to your tracker." 
            : "Update the details of this problem."}
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Problem Details</TabsTrigger>
              <TabsTrigger value="patterns">Patterns & Tricks</TabsTrigger>
            </TabsList>
            
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problem Title</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="leetcodeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LeetCode Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder=""
                            {...field}
                            value={field.value === 0 ? "" : field.value}
                            onFocus={(e) => {
                              // When focused and value is 0, clear the display
                              if (field.value === 0) {
                                e.currentTarget.value = "";
                              }
                            }}
                            onBlur={(e) => {
                              // When leaving field and it's empty, set back to 0
                              if (e.currentTarget.value === "") {
                                field.onChange(0);
                              }
                            }}
                            onChange={(e) => {
                              // When typing, handle empty string as 0 internally
                              const value = e.currentTarget.value === "" ? 0 : parseInt(e.currentTarget.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                            className="appearance-none"
                          />
                          {leetcodeNumberStatus === "valid" && (
                            <CheckCircle className="absolute right-2 top-2 text-green-500" />
                          )}
                          {leetcodeNumberStatus === "invalid" && (
                            <XCircle className="absolute right-2 top-2 text-red-500" />
                          )}
                        </div>
                      </FormControl>
                      {leetcodeNumberStatus === "invalid" && (
                        <FormMessage>
                          We have this problem, do you want to modify it?
                        </FormMessage>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LeetCode URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://leetcode.com/problems/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste the problem description here. Markdown is supported." 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="Easy" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Easy</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="Medium" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Medium</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="Hard" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Hard</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            {/* Problem Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Constraints</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={handleAddConstraint}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Constraint
                  </Button>
                </div>
                <div className="space-y-2 border rounded-md p-3 bg-slate-50">
                  {constraintFields.length > 0 ? (
                    constraintFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        {confirmedConstraints[index] ? (
                          <>
                            <span className="text-sm text-gray-700 flex-grow">• {form.getValues(`constraints.${index}`)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-500 hover:text-red-600"
                              onClick={() => {
                                removeConstraint(index);
                                // Remove from confirmed constraints too
                                setConfirmedConstraints(prev => {
                                  const newState = {...prev};
                                  delete newState[index];
                                  return newState;
                                });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <FormField
                              control={form.control}
                              name={`constraints.${index}`}
                              render={({ field }) => (
                                <FormItem className="flex-grow mb-0">
                                  <FormControl>
                                    <Input placeholder="e.g., 1 <= nums.length <= 10^5" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                removeConstraint(index);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                const currentConstraint = form.getValues(`constraints.${index}`);
                                if (typeof currentConstraint === "string" && currentConstraint.trim() !== "") {
                                  const updatedConstraints = [...form.getValues("constraints")];
                                  updatedConstraints[index] = currentConstraint.trim();
                                  form.setValue("constraints", updatedConstraints);
                                  
                                  // Mark this constraint as confirmed
                                  setConfirmedConstraints(prev => ({
                                    ...prev,
                                    [index]: true
                                  }));
                                  
                                  toast({
                                    title: "Constraint added",
                                    description: "Your constraint has been successfully added.",
                                  });
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "Constraint cannot be empty.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Confirm
                            </Button>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 p-2">No constraints added yet.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Examples</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => appendExample({ input: "", output: "", explanation: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Example
                  </Button>
                </div>
                <div className="space-y-4 border rounded-md p-3 bg-slate-50">
                  {exampleFields.length > 0 ? (
                    exampleFields.map((field, index) => (
                      <div key={field.id} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Example {index + 1}</span>
                        </div>
                        
                        {confirmedExamples[index] ? (
                          <div className="bg-slate-100 rounded-md p-3 space-y-1">
                            <div className="flex">
                              <span className="text-sm font-medium w-24">Input:</span>
                              <span className="text-sm">{form.getValues(`examples.${index}.input`)}</span>
                            </div>
                            <div className="flex">
                              <span className="text-sm font-medium w-24">Output:</span>
                              <span className="text-sm">{form.getValues(`examples.${index}.output`)}</span>
                            </div>
                            {form.getValues(`examples.${index}.explanation`) && (
                              <div className="flex">
                                <span className="text-sm font-medium w-24">Explanation:</span>
                                <span className="text-sm">{form.getValues(`examples.${index}.explanation`)}</span>
                              </div>
                            )}
                            <div className="flex justify-end mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-500 hover:text-red-600"
                                onClick={() => {
                                  removeExample(index);
                                  setConfirmedExamples(prev => {
                                    const newState = {...prev};
                                    delete newState[index];
                                    return newState;
                                  });
                                }}
                              >
                                <X className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <FormField
                              control={form.control}
                              name={`examples.${index}.input`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Input</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`examples.${index}.output`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Output</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`examples.${index}.explanation`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Explanation (Optional)</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeExample(index)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  const input = form.getValues(`examples.${index}.input`);
                                  const output = form.getValues(`examples.${index}.output`);
                                  
                                  if (!input.trim() || !output.trim()) {
                                    toast({
                                      title: "Error",
                                      description: "Input and Output are required.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  // Mark as confirmed
                                  setConfirmedExamples(prev => ({
                                    ...prev,
                                    [index]: true
                                  }));
                                  
                                  toast({
                                    title: "Example added",
                                    description: "Your example has been successfully added.",
                                  });
                                }}
                              >
                                Confirm
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 p-2">No examples added yet.</p>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Patterns & Tricks Tab */}
            <TabsContent value="patterns" className="space-y-4">
              {/* Pattern Section with improved search */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Patterns</FormLabel>
                </div>
                
                {/* Enhanced pattern search */}
                <div className="relative mb-4" ref={patternSearchRef}>
                  <div className="flex">
                    <div className="relative flex-grow">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search patterns or type to create new..."
                        className="pl-8 pr-10"
                        value={patternSearchQuery}
                        onChange={(e) => setPatternSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (patternSearchQuery.length >= 2) {
                            setShowPatternResults(true);
                          }
                        }}
                      />
                      {isPatternSearching && (
                        <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {/* Pattern results dropdown */}
                  {showPatternResults && patternSearchQuery.length >= 2 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 shadow-lg rounded-md border border-slate-200 dark:border-slate-700 max-h-60 overflow-auto">
                      {patternSuggestions.length > 0 ? (
                        <ul className="py-1">
                          {patternSuggestions.map((pattern) => (
                            <li 
                              key={pattern.id} 
                              className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              onClick={() => handlePatternSelect(pattern)}
                            >
                              <div>
                                <div className="font-medium">{pattern.name}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[300px]">
                                  {pattern.description || "No description"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-400">
                                {pattern.usageCount || 0} uses
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-slate-600 mb-2">No patterns found with "{patternSearchQuery}"</p>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={handleCreateNewPattern}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create new pattern
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Added patterns list */}
                <div className="space-y-4 border rounded-md p-3 bg-slate-50">
                  {patternFields.length > 0 ? (
                    patternFields.map((field, index) => (
                      <div key={field.id} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Pattern {index + 1}</span>
                        </div>
                        
                        {confirmedPatterns[index] ? (
                          <div className="bg-slate-100 rounded-md p-3 space-y-1">
                            <div className="font-medium text-sm">
                              {form.getValues(`patterns.${index}.name`)}
                            </div>
                            <div className="text-sm">
                              {form.getValues(`patterns.${index}.description`) || "No description"}
                            </div>
                            <div className="flex justify-end mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-500 hover:text-red-600"
                                onClick={() => handleRemovePattern(index)}
                              >
                                <X className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <FormField
                              control={form.control}
                              name={`patterns.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Sliding Window" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`patterns.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Explain how this pattern applies to the problem" 
                                      className="min-h-[80px]"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePattern(index)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => handleConfirmCustomPattern(index)}
                              >
                                Confirm
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 p-2">No patterns added yet.</p>
                  )}
                </div>
              </div>

              {/* Trick Section with improved search */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Tricks</FormLabel>
                </div>
                
                {/* Enhanced trick search */}
                <div className="relative mb-4" ref={trickSearchRef}>
                  <div className="flex">
                    <div className="relative flex-grow">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tricks or type to create new..."
                        className="pl-8 pr-10"
                        value={trickSearchQuery}
                        onChange={(e) => setTrickSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (trickSearchQuery.length >= 2) {
                            setShowTrickResults(true);
                          }
                        }}
                      />
                      {isTrickSearching && (
                        <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {/* Trick results dropdown */}
                  {showTrickResults && trickSearchQuery.length >= 2 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 shadow-lg rounded-md border border-slate-200 dark:border-slate-700 max-h-60 overflow-auto">
                      {trickSuggestions.length > 0 ? (
                        <ul className="py-1">
                          {trickSuggestions.map((trick) => (
                            <li 
                              key={trick.id} 
                              className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              onClick={() => handleTrickSelect(trick)}
                            >
                              <div>
                                <div className="font-medium">{trick.name}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[300px]">
                                  {trick.description || "No description"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-400">
                                {trick.usageCount || 0} uses
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-slate-600 mb-2">No tricks found with "{trickSearchQuery}"</p>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={handleCreateNewTrick}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create new trick
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Added tricks list */}
                <div className="space-y-4 border rounded-md p-3 bg-slate-50">
                  {trickFields.length > 0 ? (
                    trickFields.map((field, index) => (
                      <div key={field.id} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Trick {index + 1}</span>
                        </div>
                        
                        {confirmedTricks[index] ? (
                          <div className="bg-slate-100 rounded-md p-3 space-y-1">
                            <div className="font-medium text-sm">
                              {form.getValues(`tricks.${index}.name`)}
                            </div>
                            <div className="text-sm">
                              {form.getValues(`tricks.${index}.description`) || "No description"}
                            </div>
                            <div className="flex justify-end mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-500 hover:text-red-600"
                                onClick={() => handleRemoveTrick(index)}
                              >
                                <X className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <FormField
                              control={form.control}
                              name={`tricks.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Use deque for O(1) operations" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`tricks.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Explain why this trick is helpful" 
                                      className="min-h-[80px]"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeTrick(index)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => handleConfirmCustomTrick(index)}
                              >
                                Confirm
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 p-2">No tricks added yet.</p>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes here. Markdown is supported." 
                        className="min-h-[100px]"
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <span className="mr-2 animate-spin">⏳</span>
              )}
              {mode === "add" ? "Add Problem" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Dialog for creating new pattern */}
      <Dialog open={isCreatingNewPattern} onOpenChange={(open) => !open && setIsCreatingNewPattern(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Pattern</DialogTitle>
            <DialogDescription>
              Create a new pattern that can be reused across problems
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={newPatternName}
                onChange={(e) => setNewPatternName(e.target.value)}
                placeholder="Pattern name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newPatternDescription}
                onChange={(e) => setNewPatternDescription(e.target.value)}
                placeholder="Explain how this pattern is used in algorithm problems"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreatingNewPattern(false);
                setPatternSearchQuery("");
              }}
              disabled={isSubmittingNewPattern}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitNewPattern}
              disabled={isSubmittingNewPattern}
            >
              {isSubmittingNewPattern ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Pattern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for creating new trick */}
      <Dialog open={isCreatingNewTrick} onOpenChange={(open) => !open && setIsCreatingNewTrick(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Trick</DialogTitle>
            <DialogDescription>
              Create a new trick that can be reused across problems
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={newTrickName}
                onChange={(e) => setNewTrickName(e.target.value)}
                placeholder="Trick name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newTrickDescription}
                onChange={(e) => setNewTrickDescription(e.target.value)}
                placeholder="Explain how this trick can be applied to algorithm problems"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreatingNewTrick(false);
                setTrickSearchQuery("");
              }}
              disabled={isSubmittingNewTrick}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitNewTrick}
              disabled={isSubmittingNewTrick}
            >
              {isSubmittingNewTrick ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Trick"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
