import { cn } from "@/lib/utils";

type LogoProps = {
    size?: number;
    className?: string;
};

export function Logo({ size = 36, className }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 93 93"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("shrink-0 rounded-xl", className)}
            aria-hidden
        >
            <rect width="93" height="93" fill="#FCF9E8" />
            <path
                d="M67.5 39.3H53.1V25H39.3C39.3 32.9 32.9 39.3 25 39.3V53.1H39.3V67.4H53.1C53.1 59.5 59.6 53.1 67.5 53.1V39.3Z"
                fill="#201B21"
            />
        </svg>
    );
}
