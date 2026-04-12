'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Clock, CreditCard, ClipboardList, Banknote, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const REPORTS = [
  {
    title: 'Employee Bank Accounts',
    description: 'View employees with and without bank account information',
    icon: CreditCard,
    href: '/reports/bank-accounts',
  },
  {
    title: 'Monthly Hours by Designation',
    description: 'Worked hours breakdown based on employee designations',
    icon: Clock,
    href: '/reports/monthly-hours',
  },
  {
    title: 'Employees by Designation',
    description: 'Workforce distribution and employee directory by role',
    icon: Users,
    href: '/reports/by-designation',
  },
  {
    title: 'Section Report',
    description: 'SL/No, description, plate no, amount, VAT and total amount',
    icon: ClipboardList,
    href: '/reports/section-report',
  },
  {
    title: 'Salary Bank Report',
    description: 'Approved salary sheet split by employees with and without bank accounts',
    icon: Banknote,
    href: '/reports/salary-bank-report',
  },
  {
    title: 'Salary Sheet Coverage',
    description: 'Employees added in the salary sheet and employees not added',
    icon: UserCheck,
    href: '/reports/salary-sheet-coverage',
  },
];

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Available Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.href} href={report.href}>
                <Card className="cursor-pointer hover:border-blue-400 transition-colors h-full">
                  <div className="flex flex-col items-start">
                    <Icon className="w-8 h-8 mb-3" style={{ color: 'var(--text-secondary)' }} />
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {report.title}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {report.description}
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
