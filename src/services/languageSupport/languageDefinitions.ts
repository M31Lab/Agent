import { LanguageFeatures } from './languageSupportService';

export const languageDefinitions: LanguageFeatures[] = [
    {
        id: 'typescript',
        fileExtensions: ['.ts', '.tsx'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ]
    },
    {
        id: 'javascript',
        fileExtensions: ['.js', '.jsx'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ]
    },
    {
        id: 'python',
        fileExtensions: ['.py'],
        commentStart: '"""',
        commentEnd: '"""',
        lineComment: '#',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['"""', '"""']
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'java',
        fileExtensions: ['.java'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'c',
        fileExtensions: ['.c', '.h'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'cpp',
        fileExtensions: ['.cpp', '.hpp', '.cc', '.h'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'csharp',
        fileExtensions: ['.cs'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'go',
        fileExtensions: ['.go'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ]
    },
    {
        id: 'ruby',
        fileExtensions: ['.rb'],
        commentStart: '=begin',
        commentEnd: '=end',
        lineComment: '#',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'php',
        fileExtensions: ['.php'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'rust',
        fileExtensions: ['.rs'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'swift',
        fileExtensions: ['.swift'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'kotlin',
        fileExtensions: ['.kt', '.kts'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ]
    },
    {
        id: 'shell',
        fileExtensions: ['.sh', '.bash'],
        commentStart: '',
        lineComment: '#',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"],
            ['`', '`']
        ]
    },
    {
        id: 'html',
        fileExtensions: ['.html', '.htm'],
        commentStart: '<!--',
        commentEnd: '-->',
        lineComment: '',
        brackets: [
            ['<', '>'],
            ['{', '}'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['<', '>'],
            ['{', '}'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['<', '>'],
            ['{', '}'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'css',
        fileExtensions: ['.css'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'lua',
        fileExtensions: ['.lua'],
        commentStart: '--[[',
        commentEnd: ']]',
        lineComment: '--',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'haskell',
        fileExtensions: ['.hs'],
        commentStart: '{-',
        commentEnd: '-}',
        lineComment: '--',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'objective-c',
        fileExtensions: ['.m', '.mm'],
        commentStart: '/*',
        commentEnd: '*/',
        lineComment: '//',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    },
    {
        id: 'perl',
        fileExtensions: ['.pl', '.pm'],
        commentStart: '=pod',
        commentEnd: '=cut',
        lineComment: '#',
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ],
        surroundingPairs: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['"', '"'],
            ["'", "'"]
        ]
    }
]; 