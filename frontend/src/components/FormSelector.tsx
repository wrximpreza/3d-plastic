import { FormType } from '../store/useConfigStore'

interface FormSelectorProps {
  selectedForm: FormType
  onSelectForm: (form: FormType) => void
}

export function FormSelector({ selectedForm, onSelectForm }: FormSelectorProps) {
  const forms: { type: FormType; label: string; icon: string }[] = [
    { type: 'rectangle', label: 'Rectangle', icon: '▭' },
    { type: 'circle', label: 'Circle', icon: '●' },
    { type: 'pentagon', label: 'Pentagon', icon: '⬟' },
    { type: 'custom', label: 'Custom', icon: '✏️' },
    { type: 'line', label: 'Line', icon: '─' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">1. Choose Form</h2>
      
      <div className="grid grid-cols-5 gap-3">
        {forms.map((form) => (
          <button
            key={form.type}
            onClick={() => onSelectForm(form.type)}
            className={`
              flex flex-col items-center justify-center
              p-4 rounded-lg border-2 transition-all
              hover:shadow-md
              ${
                selectedForm === form.type
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-300 bg-white hover:border-blue-300'
              }
            `}
          >
            <div className="text-4xl mb-2">{form.icon}</div>
            <div className={`text-xs font-medium ${
              selectedForm === form.type ? 'text-blue-700' : 'text-gray-600'
            }`}>
              {form.label}
            </div>
          </button>
        ))}
      </div>

      {selectedForm && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Selected:</span>{' '}
            {forms.find(f => f.type === selectedForm)?.label}
          </p>
        </div>
      )}
    </div>
  )
}

