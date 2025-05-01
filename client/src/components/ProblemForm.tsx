import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Problem, insertProblemSchema, patternSchema, trickSchema, exampleSchema, difficultyEnum } from "@shared/schema";
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

interface ProblemFormProps {
  problem?: Problem;
  onClose: () => void;
  mode: "add" | "edit";
}

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

  // Initialize the form with defaults or provided problem
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: problem ? {
      title: problem.title || "",
      url: problem.url || "",
      content: problem.content || "",
      constraints: problem.constraints || [],
      examples: problem.examples || [],
      patterns: problem.patterns || [],
      tricks: problem.tricks || [],
      notes: problem.notes || "",
      difficulty: problem.difficulty || "Medium",
      createdAt: problem.createdAt || new Date().toISOString(),
      updatedAt: problem.updatedAt || new Date().toISOString()
    } : {
      title: "",
      url: "",
      content: "",
      constraints: [],
      examples: [],
      patterns: [],
      tricks: [],
      notes: "",
      difficulty: "Medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  // Set up field arrays for repeating elements
  const { 
    fields: constraintFields, 
    append: appendConstraint, 
    remove: removeConstraint 
  } = useFieldArray({
    control: form.control,
    name: "constraints"
  });

  const { 
    fields: exampleFields, 
    append: appendExample, 
    remove: removeExample 
  } = useFieldArray({
    control: form.control,
    name: "examples"
  });

  const { 
    fields: patternFields, 
    append: appendPattern, 
    remove: removePattern 
  } = useFieldArray({
    control: form.control,
    name: "patterns"
  });

  const { 
    fields: trickFields, 
    append: appendTrick, 
    remove: removeTrick 
  } = useFieldArray({
    control: form.control,
    name: "tricks"
  });

  // Add mutation for creating/updating problems
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (mode === "add") {
        return apiRequest("POST", "/api/problems", data);
      } else {
        return apiRequest("PATCH", `/api/problems/${problem!.id}`, data);
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
          setLocation(`/problems/${newProblem.id}`);
        });
      } else {
        toast({
          title: "Problem updated",
          description: "Your problem has been successfully updated.",
        });
        onClose();
        // Invalidate the specific problem query
        queryClient.invalidateQueries({ queryKey: ['/api/problems', problem!.id] });
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Update timestamps
    data.updatedAt = new Date().toISOString();
    if (mode === "add") {
      data.createdAt = new Date().toISOString();
    }
    
    mutation.mutate(data);
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
                        <Input placeholder="Two Sum" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              </div>

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
                    onClick={() => appendConstraint("")}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Constraint
                  </Button>
                </div>
                <div className="space-y-2 border rounded-md p-3 bg-slate-50">
                  {constraintFields.length > 0 ? (
                    constraintFields.map((field, index) => (
                      <div key={field.id} className="flex items-center">
                        <FormField
                          control={form.control}
                          name={`constraints.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => removeConstraint(index)}
                        >
                          <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                        </Button>
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => removeExample(index)}
                          >
                            <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                        
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
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => appendPattern({ name: "", description: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Pattern
                  </Button>
                </div>
                <div className="space-y-4 border rounded-md p-3 bg-slate-50">
                  {patternFields.length > 0 ? (
                    patternFields.map((field, index) => (
                      <div key={field.id} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Pattern {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => removePattern(index)}
                          >
                            <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                        
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
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => appendTrick({ name: "", description: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Trick
                  </Button>
                </div>
                <div className="space-y-4 border rounded-md p-3 bg-slate-50">
                  {trickFields.length > 0 ? (
                    trickFields.map((field, index) => (
                      <div key={field.id} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Trick {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => removeTrick(index)}
                          >
                            <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                        
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
