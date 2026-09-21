// app/rx-order/pharmacy/[uuid]/page.tsx
'use client';;
import { use } from "react";

import PharmacyView from '@/components/rxQrCode/PharmacyView';

export default function PharmacistRxViewPage(props: { params: Promise<{ uuid: string }> }) {
    const params = use(props.params);
    return <PharmacyView uuid={params.uuid} />;
}