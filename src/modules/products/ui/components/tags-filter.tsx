import { useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";

import { tagsApi, type Tag } from "@/lib/api-client";
import { Checkbox } from "@/components/ui/checkbox";

interface TagsFilterProps {
  value?: string[] | null;
  onChange: (value: string[]) => void;
}

export const TagsFilter = ({ value, onChange }: TagsFilterProps) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tagsApi.list().then((res) => {
      if (res.success && res.data) setTags(res.data);
      setIsLoading(false);
    });
  }, []);

  const onClick = (name: string) => {
    if (value?.includes(name)) {
      onChange(value.filter((t) => t !== name));
    } else {
      onChange([...(value || []), name]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoaderIcon className="size-4 animate-spin" />
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-2">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex items-center justify-between cursor-pointer"
          onClick={() => onClick(tag.name)}
        >
          <p className="font-medium">{tag.name}</p>
          <Checkbox
            checked={value?.includes(tag.name)}
            onCheckedChange={() => onClick(tag.name)}
          />
        </div>
      ))}
    </div>
  );
};
