"use client"


import {User} from "lucide-react";

export function Header() {
    return (
        <div className="items-center py-4 px-6">
            <div className="text-2xl font-medium text-center flex items-center justify-center gap-2 text-foreground">
                <User className={'w-12 h-12 mr-2 text-center text-primary'}/>
                My Profile
            </div>

        </div>
    )
}
