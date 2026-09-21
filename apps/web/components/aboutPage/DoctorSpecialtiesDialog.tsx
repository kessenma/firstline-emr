import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from 'lucide-react'
import { DoctorSpecialties } from '@/data/doctorSpecialty.enum'

export function DoctorSpecialtiesDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Doctor Specialties Information</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Available Doctor Specialties</DialogTitle>
                    <DialogDescription>
                        The following doctor specialties are available:
                    </DialogDescription>
                </DialogHeader>
                <ul className="mt-4 space-y-2">
                    {DoctorSpecialties.map((specialty, index) => (
                        <li key={index}>{specialty}</li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    )
}

