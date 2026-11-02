import { FormControlLabel, Switch, TextField } from '@mui/material'

/** Keys of `Values` whose value has type `T`. */
type KeysOfType<Values, T> = {
    [K in keyof Values]: Values[K] extends T ? K : never
}[keyof Values]

export type FieldDefinition<Values> =
    | {
          kind: 'text' | 'number' | 'multiline'
          name: KeysOfType<Values, string>
          label: string
          helperText?: string
      }
    | {
          kind: 'switch'
          name: KeysOfType<Values, boolean>
          label: string | ((value: boolean) => string)
      }

interface FormFieldsProps<Values> {
    fields: FieldDefinition<Values>[]
    values: Values
    onChange: (changes: Partial<Values>) => void
}

/** Renders a column of inputs from declarative field definitions. */
export const FormFields = <
    Values extends Record<keyof Values, string | boolean>,
>({
    fields,
    values,
    onChange,
}: FormFieldsProps<Values>) =>
    fields.map(field => {
        const name = String(field.name)

        if (field.kind === 'switch') {
            const checked = values[field.name] as boolean

            return (
                <FormControlLabel
                    key={name}
                    control={
                        <Switch
                            checked={checked}
                            onChange={(_event, next) =>
                                onChange({
                                    [field.name]: next,
                                } as Partial<Values>)
                            }
                        />
                    }
                    label={
                        typeof field.label === 'function'
                            ? field.label(checked)
                            : field.label
                    }
                />
            )
        }

        return (
            <TextField
                key={name}
                name={name}
                label={field.label}
                helperText={field.helperText}
                value={values[field.name]}
                onChange={event =>
                    onChange({
                        [field.name]: event.target.value,
                    } as Partial<Values>)
                }
                type={field.kind === 'number' ? 'number' : 'text'}
                multiline={field.kind === 'multiline'}
                minRows={field.kind === 'multiline' ? 3 : undefined}
                size={'small'}
                fullWidth={true}
            />
        )
    })
