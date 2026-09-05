from fastapi import FastAPI, Response
from pydantic import BaseModel
from typing import Any
from .agents.graph_agent import run_recovery_pipeline
from .services.core_logic import evaluate_stop_rule, detect_dispute_or_utr, parse_conversational_ptp
from .services.pdf_generator import build_pdf_report
from .services.voice_utils import synthesize_regional_voice_note_cached
import base64
import os, tempfile

app=FastAPI(title='RazorRescue AI Service',version='2.1.0')

@app.get('/')
def root():
    return {'service':'razorrescue-ai','status':'ok','message':'AI service is running. See /docs for API documentation.'}
class RecoveryRequest(BaseModel):
    transaction: dict[str,Any]
    target_lang: str='Hinglish'
    is_suppressed: bool=False
    force_dispatch: bool=False
    force_approve: bool=False
    simulated_hour: int|None=None
class TextRequest(BaseModel): text: str
class ReportRequest(BaseModel): audits:list[dict]; total_lost:float=0; total_recovered:float=0; penalties_saved:float=0
class VoiceRequest(BaseModel): text:str; target_lang:str='Hinglish'
@app.get('/health')
def health(): return {'ok':True,'service':'razorrescue-ai'}
@app.post('/recovery/run')
def recovery(req:RecoveryRequest): return run_recovery_pipeline(req.transaction,req.target_lang,req.is_suppressed,req.force_dispatch,req.force_approve,req.simulated_hour)
@app.post('/ptp/analyze')
def ptp(req:TextRequest):
    dispute=detect_dispute_or_utr(req.text)
    if dispute.get('is_dispute'): return {'result':dispute}
    parsed=parse_conversational_ptp(req.text)
    return {'result':parsed | {'status':'PTP_COMMITMENT' if parsed.get('has_commitment') else 'NORMAL_FLOW'}}
@app.post('/voice/synthesize')
def voice(req:VoiceRequest):
    audio=synthesize_regional_voice_note_cached(req.text,req.target_lang)
    if not audio: return {'ok':False,'audio_base64':None}
    return {'ok':True,'audio_base64':base64.b64encode(audio).decode('ascii')}
@app.post('/compliance/evaluate')
def compliance(req:TextRequest):
    is_opt_out,reason=evaluate_stop_rule(req.text); return {'is_opt_out':is_opt_out,'reason':reason}
@app.post('/report')
def report(req:ReportRequest):
    out_path=os.path.join(tempfile.gettempdir(),'RazorRescue_Executive_Audit.pdf')
    build_pdf_report(req.audits,req.total_lost,req.total_recovered,req.penalties_saved,out_path)
    with open(out_path,'rb') as f: data=f.read()
    return Response(content=data,media_type='application/pdf',headers={'Content-Disposition':'attachment; filename="RazorRescue_Executive_Audit.pdf"'})
