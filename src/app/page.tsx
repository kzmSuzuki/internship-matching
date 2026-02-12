"use client";

import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">UI Component Showcase</h1>
          <p className="text-gray-500">Design System Verification</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Buttons</h2>
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button isLoading>Loading</Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-4">Inputs & Selects</h2>
            <div className="space-y-4">
              <Input label="Text Input" placeholder="Enter something..." />
              <Input label="Error Input" error="Something went wrong" />
              <Select 
                label="Select Option" 
                options={[
                  { label: 'Option 1', value: '1' },
                  { label: 'Option 2', value: '2' },
                ]} 
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-4">Badges</h2>
            <div className="flex gap-2">
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-4">Interactive</h2>
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          </Card>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Test Modal">
          <p className="text-gray-600 mb-4">
            This is a test modal to verify the Glassmorphism UI and Portal implementation.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
