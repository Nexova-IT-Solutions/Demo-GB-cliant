"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, Building2, Printer } from "lucide-react";
import qz from "qz-tray";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const companyDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required").optional().or(z.literal("")),
  mobileNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  crNumber: z.string().optional().or(z.literal("")),
  posPrinterName: z.string().optional().or(z.literal("")),
});

type CompanyDetailsValues = z.infer<typeof companyDetailsSchema>;

export default function CompanyDetailsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<CompanyDetailsValues>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      companyName: "",
      mobileNumber: "",
      address: "",
      website: "",
      email: "",
      crNumber: "",
      posPrinterName: "",
    },
  });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch("/api/admin/company-details");
        if (!res.ok) throw new Error("Failed to fetch details");
        const data = await res.json();
        
        form.reset({
          companyName: data.companyName || "",
          mobileNumber: data.mobileNumber || "",
          address: data.address || "",
          website: data.website || "",
          email: data.email || "",
          crNumber: data.crNumber || "",
          posPrinterName: data.posPrinterName || "",
        });
      } catch (err) {
        toast.error("Failed to load company details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [form]);

  const [printers, setPrinters] = useState<string[]>([]);
  const [isConnectingQz, setIsConnectingQz] = useState(false);

  const fetchPrinters = async () => {
    setIsConnectingQz(true);
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 0 });
      }
      const foundPrinters = await qz.printers.find();
      setPrinters(foundPrinters);
      toast.success("Connected to QZ Tray & found printers");
    } catch (err) {
      console.error(err);
      toast.error("Could not connect to QZ Tray. Make sure it is installed and running.");
    } finally {
      setIsConnectingQz(false);
    }
  };

  useEffect(() => {
    // Attempt to auto-connect to QZ Tray silently in the background
    qz.websocket.connect({ retries: 0 }).then(() => {
      return qz.printers.find();
    }).then((foundPrinters) => {
      setPrinters(foundPrinters);
    }).catch((e) => {
      console.log("Silent QZ connection failed (it might not be running yet)");
    });
  }, []);

  const handleTestPrint = async () => {
    const selectedPrinter = form.getValues("posPrinterName");
    if (!selectedPrinter) {
      toast.error("Please select a printer first.");
      return;
    }
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 0 });
      }
      const config = qz.configs.create(selectedPrinter);
      // Basic raw text print for testing connectivity, followed by some newlines to push paper out
      const data = [
        "\n",
        "TEST PRINT SUCCESSFUL\n",
        "--------------------------\n",
        "If you can read this, your\n",
        "printer is connected and\n",
        "ready to use with the POS.\n",
        "\n\n\n\n\n\n"
      ];
      await qz.print(config, data);
      toast.success("Test print sent to printer!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send test print. Is the printer online?");
    }
  };

  const onSubmit = async (values: CompanyDetailsValues) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/company-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save details");
      toast.success("Company details saved successfully!");
    } catch (err) {
      toast.error("Failed to save company details");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#A7066A]" />
            Company Details
          </h1>
          <p className="text-sm text-slate-500">
            Manage your company information. These details will appear on printed and downloaded receipts.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="crNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CR Number / Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter CR or Tax Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. www.yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter complete address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#A7066A]" />
                POS Receipt Printer
              </h2>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="posPrinterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Printer (Requires QZ Tray)</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] focus:border-transparent"
                            {...field}
                          >
                            <option value="">-- No Printer Configured --</option>
                            {printers.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                            {/* If the current saved printer isn't in the list, still show it as an option */}
                            {field.value && !printers.includes(field.value) && (
                              <option value={field.value}>{field.value} (Saved)</option>
                            )}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2 mb-[2px]">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={fetchPrinters} 
                    disabled={isConnectingQz}
                  >
                    {isConnectingQz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connect & Find Printers"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleTestPrint} 
                  >
                    Test Printer
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Select the LAN/Local printer to use for direct receipt printing in the POS. 
                Requires <a href="https://qz.io/" target="_blank" rel="noopener noreferrer" className="text-[#A7066A] hover:underline">QZ Tray</a> to be installed and running on the POS terminal computer.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#A7066A] hover:bg-[#8A0558] text-white min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Details
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
