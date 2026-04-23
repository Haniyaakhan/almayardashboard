'use client';

import Link from 'next/link';
import { CreditCard, FileText, Calculator, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const PAYMENT_MODULES = [
  {
    title: 'Cash Receipt Payment',
    description: 'Payer/payee details, payment breakdown, method and authorization.',
    icon: CreditCard,
    href: '/payment-modules/cash-receipt-payment',
  },
  {
    title: 'Invoice Generation',
    description: 'Create professional tax invoices with manual line items and formatting.',
    icon: FileText,
    href: '/payment-modules/invoice-generation',
  },
  {
    title: 'Salary Generation',
    description: 'Search labor by ID/name and generate salary view grouped by designation.',
    icon: Calculator,
    href: '/payment-modules/salary-generation',
  },
  {
    title: 'LPO Generation',
    description: 'Create editable LPOs with vendor/buyer details, line items, and A4 print/PDF export.',
    icon: FileSpreadsheet,
    href: '/payment-modules/lpo-generation',
  },
];

export default function PaymentModulesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Available Payment Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PAYMENT_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href}>
                <Card className="cursor-pointer hover:border-blue-400 transition-colors h-full">
                  <div className="flex flex-col items-start">
                    <Icon className="w-8 h-8 mb-3" style={{ color: 'var(--text-secondary)' }} />
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {module.title}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {module.description}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
