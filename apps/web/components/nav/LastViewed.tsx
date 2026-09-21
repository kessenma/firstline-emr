// apps/web/components/nav/LastViewed.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function LastViewed() {
    const { data: session } = useSession();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (session?.user?.lastView && session.user.lastView !== "/dashboard") {
            setOpen(true);
        }
    }, [session]);

    const goToLastPage = () => {
        if (session?.user?.lastView) {
            router.push(session.user.lastView);
        }
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent size="sm">
                <DialogHeader>
                    <DialogTitle>Return to Last Page?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Would you like to continue where you left off?
                </p>
                <DialogFooter>
                    <Button onClick={goToLastPage}>
                        Go Back
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline">No Thanks</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
