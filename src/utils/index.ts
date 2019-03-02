export const cleanup = (value: any) => {
    if (Array.isArray(value) && !value.length) {
        return null;
    } else if (value && typeof value === 'object') {
        Object.keys(value).forEach(key => {
            value[key] = cleanup(value[key]);
        });
    }

    return value;
};

export const collection = (resolve: any, reject: any) => {
    return (err: any, result: any) => {
        if (err) {
            reject(err);
        } else {
            let items = [];
            if (result.Items && result.Items.length) {
                items = result.Items.map((dynogelItem: any) => {
                    return dynogelItem.attrs;
                });
            }
            resolve(items);
        }
    };
};

export const item = (resolve: any, reject: any) => {
    return (err: any, result: any) => {
        if (err) {
            reject(err);
        } else {
            resolve(result.attrs || null);
        }
    };
};

export const firstItem = (resolve: any, reject: any) => {
    return (err: any, result: any) => {
        if (err) {
            reject(err);
        } else {
            const res = result.Items && result.Items.length ? result.Items[0].attrs : null;
            resolve(res);
        }
    };
};
