// apps/web/components/ui/icon-button.tsx
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

interface IconButtonProps extends ButtonProps {
    icon: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, className, ...props }) => {
    return (
        <Button
            variant="ghost"
            size="icon"
            className={`p-0 hover:bg-transparent ${className}`}
            {...props}
        >
            {icon}
        </Button>
    );
};
