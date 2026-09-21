import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from 'lucide-react'
import {Countries, CountriesList} from '@/data/countries.enum'

export function CountriesDialog() {
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
                    <DialogTitle>Patient Services Available for the Following Countries:</DialogTitle>
                    <DialogDescription>
                        (more to come soon)
                    </DialogDescription>
                </DialogHeader>
                <ul className="mt-4 space-y-2">
                    {CountriesList.map((country, index) => (
                        <li key={index}>{country}</li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    )
}

