// app/complete-signup/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Flex from "./../../components/ui/flex";
import Text from "./../../components/ui/text";
import { Card } from './../../components/ui/card';
import { RadioCard } from './../../components/ui/radio-card';
import { Button } from "./../../components/ui/button";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import "../about/aboutPage.css";


const SignupSuccess = () => {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [accountType, setAccountType] = useState<'Doctor' | 'Triage' | 'Evac'>('Doctor');
    const [submitting, setSubmitting] = useState(false);

    const handleAccountTypeChange = (value: 'Doctor' | 'Triage' | 'Evac') => {
        setAccountType(value);
    };    

    const heartRateOpacity = accountType === 'Doctor' ? 'opacity-80' : 'opacity-20';
    const ballsOpacity = accountType === 'Doctor' ? 'opacity-20' : 'opacity-80';

    useEffect(() => {
        if (!session) {
            router.push('/');
        }
    }, [session, router]); 

    const handleSubmit = async () => {
        if (!session) return;
    
        await update({ ...session, user: { ...session.user, accountType }});
    
        await fetch(`/api/google-user/${session.user?.email}`, {
        method: 'PATCH',
        body: JSON.stringify({ accountType }),
        headers: { 'Content-Type': 'application/json' },
        });
    
        router.replace('/patient-dashboard');
    };

    return (
        <ThemeProvider roleOverride={accountType === 'Doctor' ? 'role-doctor' : accountType === 'Evac' ? 'role-evac' : 'role-triage'} brandOverride={'brand-global'}>
        <div className="h-screen w-full p-4 flex flex-col items-center justify-center relative bg-background text-foreground">
            <div className="absolute top-0 left-0 w-full h-full bg-transparent z-0">
                <section className="container absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4">
                    <div className="content">
                        <div className={`ball ball1 ${ballsOpacity}`}></div>
                        <div className={`ball ball2 ${ballsOpacity}`}></div>
                        <div className={`ball ball3 ${ballsOpacity}`}></div>
                        <div className={`ball ball4 ${ballsOpacity}`}></div>
                        <div className={`ball ball5 ${ballsOpacity}`}></div>
                        <div className="heart-rate">
                            <svg viewBox="0 9 498.778 54.805" className={`w-full h-full ${heartRateOpacity}`}>
                                <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" points="0 45.486 64.133 45.486 74.259 33.324 84.385 45.486 96.2 45.486 104.637 55.622 119.825 9 133.327 63.729 140.079 45.486 162.018 45.486 172.146 40.419 183.958 45.486 249.778 45.486" />
                                <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" points="249 45.562 313.133 45.562 323.259 33.4 333.385 45.562 345.2 45.562 353.637 55.698 368.825 9.076 382.327 63.805 389.079 45.562 411.018 45.562 421.146 40.495 432.958 45.562 498.778 45.562" />
                            </svg>
                            <div className="fade-in text-primary"></div>
                            <div className="fade-out text-primary"></div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="flex flex-col items-center justify-center w-full max-w-md z-10">
            <h1 className="text-2xl font-bold mb-4">Complete Your Sign-Up</h1>

                <Card className="w-full" borderColor="border-white" borderSize={2}>
                        <div className="signup-card w-full">
                            <div className="mb-8">
                                <RadioCard.Root
                                    value={accountType}
                                    onValueChange={handleAccountTypeChange}
                                    className="flex justify-between w-full"
                                >
                                    <RadioCard.Item value="Doctor" className="w-1/2 p-2">
                                        <Flex direction="column" width="100%" className="justify-center items-center h-full">
                                            <Text size="sm" weight="normal" className="text-foreground">Doctor</Text>
                                        </Flex>
                                    </RadioCard.Item>
                                    <RadioCard.Item value="Triage" className="w-1/2 p-2">
                                        <Flex direction="column" width="100%" className="justify-center items-center h-full">
                                            <Text size="sm" weight="normal" className="text-foreground">Triage Coordinator</Text>
                                        </Flex>
                                        </RadioCard.Item>
                                    <RadioCard.Item value="Evac" className="w-1/3 p-2">
                                       <Flex direction="column" width="100%" className="justify-center items-center h-full">
                                            <Text size="sm" weight="normal" className="text-foreground">Evac Coordinator</Text>
                                        </Flex>
                                    </RadioCard.Item>
                                </RadioCard.Root>
                                {accountType && 
                                (
                                    <div className="flex justify-center mt-6">
                                        <Button
                                            onClick={handleSubmit}
                                            type="submit"
                                            disabled={submitting}
                                        >
                                            {submitting ? "Submitting..." : "Submit"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                </Card>
            </div>
        </div>
        </ThemeProvider>
    );
};

export default SignupSuccess;
