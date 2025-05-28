import React from 'react';
import * as XLSX from 'xlsx'; 
import { supabase } from '../utils/supabaseClient.js'; 

export default function XlsxUploader() {
    const [file, setFile] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [isError, setIsError] = React.useState(false);

    const COLUMN_MAP = {
        'CONTRATO': 'arflash',          
        'UF': 'uf',
        'DATA': 'recepcionado_em',      
        'STATUS CAPITAL': 'situacao',   
    };

    const handleFileChange = (event) => {
        if (event.target.files[0]) {
            const selectedFile = event.target.files[0];
            const fileName = selectedFile.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
                setMessage('Por favor, selecione um arquivo Excel (.xlsx ou .xls).');
                setIsError(true);
                setFile(null);
                return;
            }

            setFile(selectedFile);
            setMessage('');
            setIsError(false);
        } else {
            setFile(null);
            setMessage('Nenhum arquivo selecionado.');
            setIsError(true);
        }
    };

    const parseXlsx = (xlsxFile) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true }); 
                const sheetName = workbook.SheetNames[0]; 
                const worksheet = workbook.Sheets[sheetName];

                const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
                    header: true, 
                    defval: "",   
                    raw: false,   
                    dateNF: "yyyy-mm-dd" 
                });

                if (jsonRows.length === 0) {
                    reject(new Error('A planilha está vazia ou não contém dados.'));
                    return;
                }

                const processedRows = jsonRows.map(row => {
                    const newRow = {};
                    let isValidRow = false; 
                    let recepcionadoDate = ''; 

                    for (const excelHeader in row) {
                        const normalizedHeader = excelHeader.trim().toUpperCase();
                        const dbColumnName = COLUMN_MAP[normalizedHeader];
                        
                        if (dbColumnName) {
                            let value = row[excelHeader];

                            if (normalizedHeader === 'DATA') {
                                newRow['recepcionado_em'] = value; 
                                recepcionadoDate = value; 
                                newRow['abertura_da_conta'] = value; 
                            } else {
                                newRow[dbColumnName] = value;
                            }

                            if (dbColumnName === 'arflash' && value && String(value).trim() !== '') {
                                isValidRow = true;
                            }
                        }
                    }
                    if (newRow.arflash) {
                        newRow.arflash = String(newRow.arflash);
                    }

                    return isValidRow ? newRow : null; 
                }).filter(row => row !== null);

                const uniqueDataMap = new Map(); 
                processedRows.forEach(row => {
                    if (row.arflash) { 
                        uniqueDataMap.set(row.arflash, row);
                    }
                });
                const parsedData = Array.from(uniqueDataMap.values()); 

                if (parsedData.length === 0) {
                    reject(new Error('Nenhum dado válido encontrado para inserção após o processamento. Verifique se os cabeçalhos estão corretos e se a coluna "CONTRATO" (ARFLASH) não está vazia.'));
                    return;
                }
                resolve(parsedData);
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsBinaryString(xlsxFile);
        });
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage('Por favor, selecione um arquivo Excel primeiro.');
            setIsError(true);
            return;
        }

        setIsLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const dataToInsert = await parseXlsx(file); 

            if (dataToInsert.length === 0) {
                setMessage('O arquivo Excel está vazio ou não contém dados válidos.');
                setIsError(true);
                setIsLoading(false);
                return;
            }

            console.log('Dados a serem inseridos no Supabase (após deduplicação):', dataToInsert);

            const { error } = await supabase
                .from('deliveries')
                .upsert(dataToInsert, { onConflict: 'arflash' }); 

            if (error) {
                console.error('Erro ao inserir dados no Supabase:', error);
                setMessage(`Erro ao fazer upload: ${error.message}`);
                setIsError(true);
            } else {
                setMessage('Dados do Excel enviados com sucesso para o Supabase!');
                setIsError(false);
                setFile(null); 
            }
        } catch (err) {
            console.error('Erro geral no upload:', err);
            setMessage(`Erro inesperado: ${err.message}`);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // Aplicado rounded-xl shadow-lg e border (classes do styles.css)
        <div className="csv-uploader p-6 space-y-4" data-name="xlsx-uploader" data-file="components/XlsxUploader.jsx">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <i className="fas fa-upload text-purple-600 mr-2"></i>
                Upload de Dados Excel
            </h3>

            <div>
                <label htmlFor="xlsx-file" className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar arquivo Excel (.xlsx, .xls):
                </label>
                <input
                    type="file"
                    id="xlsx-file"
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
            </div>

            {file && (
                <p className="text-sm text-gray-600">Arquivo selecionado: <span className="font-semibold">{file.name}</span></p>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || isLoading}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg 
                    ${!file || isLoading 
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                    }`}
            >
                {isLoading ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                    <i className="fas fa-cloud-upload-alt mr-2"></i>
                )}
                {isLoading ? 'Enviando...' : 'Fazer Upload'}
            </button>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}