'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Mail } from "lucide-react";

interface FooterProps {
    className?: string;
}


const Footer: React.FC<FooterProps> = ({ className }) => {
    const { data: session } = useSession();

    return (
        <footer className={className}>
            <div className="px-4 mx-auto sm:px-6">
                <div className={`flex justify-center ${session ? '':'py-4 md:py-8 flex-col md:justify-between'}`}>
                    <a href="/about" className={`text-muted-foreground text-center ${session ? 'px-8 text-sm' : ''}`}>About Fajr.EMR</a>
                    <span className={`${session ? 'px-8' : 'flex justify-center'}`}>
                        <Mail className="w-4 h-4 text-muted-foreground"/>
                        <a href="mailto:support@menahealth.org"
                           className="text-sm text-center text-muted-foreground">info@fajr.org</a>
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
