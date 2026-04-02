'use client';

import Link from 'next/link';
import { CreditCard, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

const PAYMENT_MODULES = [
  {
    title: 'Cash Receipt Payment',
    description: 'Payer/payee details, payment breakdown, method and authorization.',
    icon: CreditCard,
    href: '/reports/cash-receipt-payment',
  },
  {
    title: 'Invoice Generation',
    description: 'Create professional tax invoices with manual line items and formatting.',
    icon: FileText,
    href: '/reports/invoice-generation',
  },
];

export default function PaymentModulesPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Payment Modules" subtitle="Standalone payment and invoice tools" />

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
