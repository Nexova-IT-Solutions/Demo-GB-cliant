import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { formatPriceServer as formatPrice } from "@/lib/currency";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, FileText } from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Customer Ledger | Admin",
  description: "Customer credit and debit history",
};

export default async function CustomerLedgerPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, "customers.view")) {
    redirect("/admin");
  }

  const customer = await db.user.findUnique({
    where: { id: params.id },
    include: {
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    redirect("/admin/reports/accounts-receivable");
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/reports/accounts-receivable"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ledger: {customer.name || "Unnamed Customer"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Transaction history and current balance
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Current Outstanding Balance</p>
          <p className={`text-4xl font-black ${customer.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {formatPrice(customer.outstandingBalance)}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-100 min-w-[140px]">
            <p className="text-xs text-slate-500 mb-1">Total Debits</p>
            <p className="font-semibold text-slate-900">
              {formatPrice(customer.ledgerEntries.filter(e => e.type === "DEBIT").reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
          <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-100 min-w-[140px]">
            <p className="text-xs text-slate-500 mb-1">Total Credits</p>
            <p className="font-semibold text-slate-900">
              {formatPrice(customer.ledgerEntries.filter(e => e.type === "CREDIT").reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Transaction History
          </h3>
        </div>
        
        {customer.ledgerEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No ledger entries found for this customer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customer.ledgerEntries.map((entry) => (
              <div key={entry.id} className="p-4 sm:p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className={`p-3 rounded-full shrink-0 ${
                  entry.type === "DEBIT" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {entry.type === "DEBIT" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-900 truncate pr-4">
                      {entry.type === "DEBIT" ? "Store Credit Used" : "Payment Received"}
                    </p>
                    <p className={`font-bold whitespace-nowrap ${
                      entry.type === "DEBIT" ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {entry.type === "DEBIT" ? "+" : "-"}{formatPrice(entry.amount)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <p className="truncate pr-4">{entry.description}</p>
                    <p className="whitespace-nowrap shrink-0">{format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  
                  {(entry.orderId || entry.paymentMethod) && (
                    <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                      {entry.orderId && (
                        <Link href={`/admin/orders/${entry.orderId}`} className="text-emerald-600 hover:underline">
                          View Order
                        </Link>
                      )}
                      {entry.paymentMethod && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase text-[10px]">
                          {entry.paymentMethod.replace("POS_", "")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
