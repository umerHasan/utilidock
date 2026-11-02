'use client';
import { LoaderCircle } from 'lucide-react';
export function ProcessingStatus({ progress }: { progress: number }) { return <div className="processing" role="status"><LoaderCircle className="spin" size={19}/><span>Creating your PDF… {progress}%</span><div className="progress-track"><span style={{ width: `${progress}%` }}/></div></div> }
