import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, CheckCircle, XCircle, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Problem, insertProblemSchema, patternSchema, trickSchema, exampleSchema, difficultyEnum, PatternReference, TrickReference } from "@shared/schema";
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
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [patternSearchQuery, setPatternSearchQuery] = useState("");
  const [trickSearchQuery, setTrickSearchQuery] = useState("");
  const [patternSuggestions, setPatternSuggestions] = useState<Pattern[]>([]);
  const [trickSuggestions, setTrickSuggestions] = useState<Trick[]>([]);
  const [patternComboboxOpen, setPatternComboboxOpen] = useState(false);
  const [trickComboboxOpen, setTrickComboboxOpen] = useState(false);
  
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

  // Fetch pattern suggestions when search query changes
  useEffect(() => {
    const fetchPatternSuggestions = async () => {
      if (patternSearchQuery.length < 2) {
        setPatternSuggestions([]);
        return;
      }
      
      try {
        const response = await apiRequest(
          "GET", 
          `/api/patterns/search?q=${encodeURIComponent(patternSearchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPatternSuggestions(data);
        }
      } catch (error) {
        console.error("Error fetching pattern suggestions:", error);
      }
    };
    
    fetchPatternSuggestions();
  }, [patternSearchQuery]);
  
  // Fetch trick suggestions when search query changes
  useEffect(() => {
    const fetchTrickSuggestions = async () => {
      if (trickSearchQuery.length < 2) {
        setTrickSuggestions([]);
        return;
      }
      
      try {
        const response = await apiRequest(
          "GET", 
          `/api/tricks/search?q=${encodeURIComponent(trickSearchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setTrickSuggestions(data);
        }
      } catch (error) {
        console.error("Error fetching trick suggestions:", error);
      }
    };
    
    fetchTrickSuggestions();
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
  const { 
    fields: constraintFields, 
    append: appendConstraint, 
    remove: removeConstraint, 
    update: updateConstraint 
  } = useFieldArray({
    control: form.control,
    name: "constraints" as const
  });

  // Removed validation from the Add Constraint button and moved it to the Confirm button.
  const handleAddConstraint = () => {
    appendConstraint(""); // Always append an empty string when adding a new constraint
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
    setPatternComboboxOpen(false);
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
    setTrickComboboxOpen(false);
  };
  
  // Helper function to create new pattern
  const handleCreateNewPattern = async () => {
    if (patternSearchQuery.trim().length === 0) {
      toast({
        title: "Empty pattern name",
        description: "Please enter a pattern name to create.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/patterns", {
        name: patternSearchQuery,
        description: ""
      });
      
      if (response.ok) {
        const newPattern = await response.json();
        handlePatternSelect(newPattern);
        
        toast({
          title: "New pattern created",
          description: `'${newPattern.name}' has been created and added to this problem.`,
        });
      }
    } catch (error) {
      console.error("Error creating pattern:", error);
      toast({
        title: "Error",
        description: "Failed to create new pattern.",
        variant: "destructive",
      });
    }
  };
  
  // Helper function to create new trick
  const handleCreateNewTrick = async () => {
    if (trickSearchQuery.trim().length === 0) {
      toast({
        title: "Empty trick name",
        description: "Please enter a trick name to create.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/tricks", {
        name: trickSearchQuery,
        description: ""
      });
      
      if (response.ok) {
        const newTrick = await response.json();
        handleTrickSelect(newTrick);
        
        toast({
          title: "New trick created",
          description: `'${newTrick.name}' has been created and added to this problem.`,
        });
      }
    } catch (error) {
      console.error("Error creating trick:", error);
      toast({
        title: "Error",
        description: "Failed to create new trick.",
        variant: "destructive",
      });
    }
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
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              field.onChange(isNaN(value) ? undefined : value);
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
                        {(typeof field === "string" && field.trim() !== "") || confirmedConstraints[index] ? (
                          <>
                            <span className="text-sm text-gray-700 flex-grow">• {typeof field === "string" ? field : form.getValues(`constraints.${index}`)}</span>
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
            
            <TabsContent value="patterns" className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Patterns</FormLabel>
                  <div className="flex space-x-2">
                    <Popover open={patternComboboxOpen} onOpenChange={setPatternComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={patternComboboxOpen}
                          className="w-[200px] justify-between"
                        >
                          <span className="truncate">{patternSearchQuery || "Search patterns..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search patterns..." 
                            value={patternSearchQuery}
                            onValueChange={setPatternSearchQuery}
                          />
                          <CommandEmpty>
                            <div className="py-3 px-2 text-sm">
                              <div className="mb-2">No patterns found.</div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                onClick={handleCreateNewPattern}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create "{patternSearchQuery}"
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {patternSuggestions.map((pattern) => (
                              <CommandItem
                                key={pattern.id}
                                onSelect={() => {
                                  handlePatternSelect(pattern);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.getValues("patterns").some(p => p.id === pattern.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{pattern.name}</div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {pattern.description || "No description"}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">{pattern.usageCount || 0} uses</div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => appendPattern({ name: "", description: "", id: "" })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Custom
                    </Button>
                  </div>
                </div>
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
                              {form.getValues(`patterns.${index}.description`)}
                            </div>
                            <div className="flex justify-end mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-500 hover:text-red-600"
                                onClick={() => {
                                  removePattern(index);
                                  setConfirmedPatterns(prev => {
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

              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Tricks</FormLabel>
                  <div className="flex space-x-2">
                    <Popover open={trickComboboxOpen} onOpenChange={setTrickComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={trickComboboxOpen}
                          className="w-[200px] justify-between"
                        >
                          <span className="truncate">{trickSearchQuery || "Search tricks..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search tricks..." 
                            value={trickSearchQuery}
                            onValueChange={setTrickSearchQuery}
                          />
                          <CommandEmpty>
                            <div className="py-3 px-2 text-sm">
                              <div className="mb-2">No tricks found.</div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                onClick={handleCreateNewTrick}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create "{trickSearchQuery}"
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {trickSuggestions.map((trick) => (
                              <CommandItem
                                key={trick.id}
                                onSelect={() => {
                                  handleTrickSelect(trick);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.getValues("tricks").some(t => t.id === trick.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{trick.name}</div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {trick.description || "No description"}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">{trick.usageCount || 0} uses</div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => appendTrick({ name: "", description: "", id: "" })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Custom
                    </Button>
                  </div>
                </div>
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
                              {form.getValues(`tricks.${index}.description`)}
                            </div>
                            <div className="flex justify-end mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-500 hover:text-red-600"
                                onClick={() => {
                                  removeTrick(index);
                                  setConfirmedTricks(prev => {
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
    </>
  );
}
