export const errorNotUnique = (field: string, path?: string): any => ({
    name: 'ValidationError',
    details: [
        {
            message: `"${field}" is not unique`,
            path: path || field,
            type: 'any.unique',
            context: {
                key: path || field,
            },
        },
    ],
});
