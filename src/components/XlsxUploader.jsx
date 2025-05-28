import React from 'react';
import * as XLSX from 'xlsx'; 
import { supabase } from '../utils/supabaseClient.js'; 

export default function XlsxUploader({ onUploadSuccess }) { 
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

    // Função auxiliar para contar situações (mantida para logs)
    const countSituations = (dataArray, stageName) => {
        const counts = new Map();
        dataArray.forEach(item => {
            const situacao = item.situacao || 'N/A';
            counts.set(situacao, (counts.get(situacao) || 0) + 1);
        });
        console.log(`XlsxUploader.jsx: --- Contagem de Situações: ${stageName} (Total: ${dataArray.length}) ---`);
        counts.forEach((count, situacao) => {
            console.log(`- "${situacao}": ${count} ocorrências`);
        });
        console.log('--- FIM Contagem de Situações ---');
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
                    dateNF: "YYYY-MM-DD" 
                });

                if (jsonRows.length === 0) {
                    reject(new Error('A planilha está vazia ou não contém dados.'));
                    return;
                }
                
                console.log(`XlsxUploader.jsx: Registros Lidos do Excel (jsonRows): ${jsonRows.length}`);
                const rawSituations = jsonRows.map(row => ({ situacao: row['STATUS CAPITAL'] })); 
                countSituations(rawSituations, 'Lidas do Excel (jsonRows)');


                const processedRows = jsonRows.map((row, rowIndex) => { 
                    const newRow = {};
                    let isValidRow = false; 

                    for (const excelHeader in row) {
                        const normalizedHeader = excelHeader.trim().toUpperCase();
                        const dbColumnName = COLUMN_MAP[normalizedHeader];
                        
                        if (dbColumnName) {
                            let value = row[excelHeader];

                            if (dbColumnName === 'abertura_da_conta' || dbColumnName === 'recepcionado_em') {
                                if (value instanceof Date) {
                                    value = value.toISOString().split('T')[0];
                                } else if (typeof value === 'number') {
                                    try {
                                        const date = XLSX.SSF.parse_date_code(value);
                                        value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                                    } catch (e) {
                                        console.warn(`XlsxUploader.jsx: Linha ${rowIndex + 2}: Erro ao converter número Excel para data: ${value}.`);
                                        value = null; 
                                    }
                                } else if (typeof value === 'string') {
                                    if (value.includes('/') && value.split('/').length === 3) {
                                        const parts = value.split('/');
                                        value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                    } 
                                    else if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                        console.warn(`XlsxUploader.jsx: Linha ${rowIndex + 2}: Formato de data string não reconhecido para "${excelHeader}": "${value}". Esperado YYYY-MM-DD ou DD/MM/YYYY.`);
                                        value = null; 
                                    }
                                } else {
                                    value = null; 
                                }

                                if (value === null) {
                                    console.error(`XlsxUploader.jsx: Linha ${rowIndex + 2}: Data inválida/nula para "${excelHeader}": ${row[excelHeader]}.`);
                                }
                            }
                            newRow[dbColumnName] = value;

                            if (dbColumnName === 'arflash' && value && String(value).trim() !== '') {
                                isValidRow = true;
                            }
                        }
                    }
                    
                    // Tratamento ARFLASH: Garante que é string e trimado, e que não é vazio.
                    if (newRow.arflash !== undefined && newRow.arflash !== null) {
                        newRow.arflash = String(newRow.arflash).trim();
                        if (newRow.arflash === '') { 
                            isValidRow = false;
                            console.warn(`XlsxUploader.jsx: Linha original ~${rowIndex + 2}: ARFLASH ficou vazio após trim. Linha será ignorada.`);
                        }
                    } else { 
                        isValidRow = false;
                        console.warn(`XlsxUploader.jsx: Linha original ~${rowIndex + 2}: ARFLASH ausente ou nulo. Linha será ignorada.`);
                    }

                    // *** CORREÇÃO PARA "abertura_da_conta" NOT NULL ***
                    // Garante que 'abertura_da_conta' (que não vem no Excel) sempre tenha um valor válido.
                    // Assumimos que é a mesma data de 'recepcionado_em' se não houver outra fonte.
                    if (!newRow.abertura_da_conta && newRow.recepcionado_em) {
                        newRow.abertura_da_conta = newRow.recepcionado_em;
                    }
                    // Se, após isso, ainda estiver nula, a linha é inválida para o DB
                    if (!newRow.abertura_da_conta) {
                        isValidRow = false;
                        console.error(`XlsxUploader.jsx: Linha original ~${rowIndex + 2}: 'abertura_da_conta' é nula. Linha será ignorada.`);
                    }

                    return isValidRow ? newRow : null; 
                }).filter(row => row !== null);

                console.log(`XlsxUploader.jsx: Registros válidos APÓS processamento inicial (antes da checagem de duplicatas): ${processedRows.length}`);
                countSituations(processedRows, 'Após Processamento Inicial');

                // *** NOVA ETAPA: CHECAR DUPLICATAS PARA ERRO DO USUÁRIO ***
                const arflashCounts = new Map();
                const duplicatesFound = new Set();
                processedRows.forEach(row => {
                    if (arflashCounts.has(row.arflash)) {
                        duplicatesFound.add(row.arflash);
                    }
                    arflashCounts.set(row.arflash, (arflashCounts.get(row.arflash) || 0) + 1);
                });

                if (duplicatesFound.size > 0) {
                    const duplicateList = Array.from(duplicatesFound).join(', ');
                    reject(new Error(`Duplicatas encontradas no arquivo para os Contratos: ${duplicateList}. Valide se não há duplicadas e tente novamente.`));
                    return; // Aborta a Promise imediatamente
                }
                // *** FIM DA CHECAGEM DE DUPLICATAS ***

                // Se não há duplicatas, os parsedData são simplesmente os processedRows
                const parsedData = processedRows; 
                
                console.log(`XlsxUploader.jsx: Registros válidos APÓS checagem de duplicatas: ${parsedData.length}`);
                countSituations(parsedData, 'Após Checagem de Duplicatas (Prontos para Inserir)');


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

            console.log('XlsxUploader.jsx: Total de registros PRONTOS PARA INSERIR no Supabase (após deduplicação e validação):', dataToInsert.length);

            // PASSO 1: EXCLUIR TODOS OS DADOS EXISTENTES DA TABELA 'deliveries'
            console.log('XlsxUploader.jsx: Excluindo todos os dados existentes na tabela deliveries...');
            const { error: deleteError } = await supabase
                .from('deliveries')
                .delete()
                .not('arflash', 'is', null); 

            if (deleteError) {
                console.error('XlsxUploader.jsx: Erro ao excluir dados existentes:', deleteError);
                setMessage(`Erro ao excluir dados antigos: ${deleteError.message}`);
                setIsError(true);
                setIsLoading(false);
                return;
            }
            console.log('XlsxUploader.jsx: Dados existentes excluídos com sucesso.');

            // PASSO 2: INSERIR OS NOVOS DADOS DO EXCEL
            const { error: insertError } = await supabase
                .from('deliveries')
                .insert(dataToInsert); 

            if (insertError) {
                console.error('XlsxUploader.jsx: Erro ao inserir novos dados no Supabase:', insertError);
                // *** TRATAMENTO DE ERROS CUSTOMIZADO ***
                if (insertError.message.includes('violates not-null constraint') || insertError.message.includes('date/time field value out of range')) {
                    setMessage(`Valide novamente se não há células de data em branco ou no formato incorreto (precisam ser yyyy-mm-dd, ex: 2025-10-10). Apague a última linha em branco do arquivo também. Erro: ${insertError.message}`);
                } else if (insertError.code === '23505' && insertError.message.includes('duplicate key value')) {
                    // Este erro 23505 (duplicate key) é para se o INSERT falhar por duplicidade *no DB*, o que não deveria ocorrer após o DELETE.
                    // Mas para garantir, podemos ter uma mensagem.
                    setMessage(`Erro de duplicidade de CONTRATO no banco de dados. Valide se não há duplicadas e tente novamente. Erro: ${insertError.message}`);
                }
                else {
                    setMessage(`Erro ao inserir novos dados: ${insertError.message}`);
                }
                setIsError(true);
            } else {
                setMessage('Dados do Excel enviados e substituídos com sucesso no Supabase!');
                setIsError(false);
                setFile(null); 
                if (onUploadSuccess) {
                    onUploadSuccess(); 
                }
            }
        } catch (err) {
            console.error('XlsxUploader.jsx: Erro geral no upload:', err);
            // Mensagens de erro de rejeição de Promise de parseXlsx
            if (err.message.includes('Duplicatas encontradas no arquivo')) {
                setMessage(err.message); // Usa a mensagem de erro da checagem de duplicatas
            } else {
                setMessage(`Erro inesperado: ${err.message}`);
            }
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
                )
                }
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