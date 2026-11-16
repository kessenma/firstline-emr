'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Mail } from "lucide-react";
import { BRAND_NAME, CONTACT_EMAIL } from "@firstline/shared/constants";

interface FooterProps {
    className?: string;
}


const Footer: React.FC<FooterProps> = ({ className }) => {
    const { data: session } = useSession();

    return (
        <footer className={className}>
            <div className="px-4 mx-auto sm:px-6">
                <div className={`flex justify-center ${session ? '':'py-4 md:py-8 flex-col md:justify-between'}`}>
                    <a href="https://firstline.care" className={`text-muted-foreground text-center ${session ? 'px-8 text-sm' : ''}`}>About {BRAND_NAME}</a>
                    <span className={`${session ? 'px-8' : 'flex justify-center'}`}>
                        <Mail className="w-4 h-4 text-muted-foreground"/>
                        <a href={`mailto:${CONTACT_EMAIL}`}
                           className="text-sm text-center text-muted-foreground">{CONTACT_EMAIL}</a>
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
