import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type SelectFormFieldProps = {
    form: any;
    fieldName: string;
    fieldLabel: string;
    selectOptions: string[];
    defaultValue?: string;
    classNames?: string;
    onChange?: (value: string) => void;
};

export function SelectFormField({
                                    form,
                                    fieldName,
                                    fieldLabel,
                                    selectOptions,
                                    defaultValue,
                                    classNames,
                                    onChange,
                                }: SelectFormFieldProps) {
    return (
        <div className={classNames}>
            <FormField
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{fieldLabel}</FormLabel>
                        <Select
                            onValueChange={(value) => {
                                field.onChange(value);
                                if (onChange) onChange(value);
                            }}
                            defaultValue={defaultValue}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {selectOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}