import { cn } from "@/lib/utils"

interface CircleSummonerAvatarProps {
  src?: string | null
  alt: string
  sizeClassName?: string
  className?: string
  imageClassName?: string
}

export default function CircleSummonerAvatar({
  src,
  alt,
  sizeClassName = "h-10 w-10",
  className,
  imageClassName,
}: CircleSummonerAvatarProps) {
  return (
    <div className={cn("summoner-avatar", sizeClassName, className)}>
      <div className="summoner-avatar-ring">
        {src ? (
          <img
            src={src}
            alt={alt}
            className={cn("summoner-avatar-image", imageClassName)}
            loading="lazy"
          />
        ) : (
          <span className="summoner-avatar-fallback">?</span>
        )}
      </div>
    </div>
  )
}
